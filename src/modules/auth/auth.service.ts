import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { CacheService } from 'utils/cache/cache.service';
import { JwtPayload } from 'utils/interfaces/jwt-payload.interface';
import { compareHash, generateHash } from 'utils/funcs/password';
import { VerifyOtpSignupDto } from './dto/verify-otp-signup.dto';
import { TooManyRequestsException } from 'utils/exceptions/too-many-requests.exception';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_TTL = 15 * 60;
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;
  private readonly jwtSecret: string;

  private readonly OTP_TTL = 2 * 60;
  private readonly OTP_RATE_TTL = 10 * 60;
  private readonly OTP_RATE_LIMIT = 3;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
  }

  async register(dto: RegisterDto) {
    const exists = await this.userRepository.findOne({
      where: [{ mobile: dto.mobile }, { name: dto.name }],
    });

    if (exists) {
      throw new ConflictException('Mobile or username already exists');
    }

    const user = this.userRepository.create({
      ...dto,
      password: await generateHash(dto.password),
    });

    await this.userRepository.save(user);

    return this.generateTokenPair(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: [{ mobile: dto.identifier }, { name: dto.identifier }],
      select: ['id', 'password', 'role'],
    });

    if (!user || !(await compareHash(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokenPair(user);
  }

  async refresh(refreshToken: string) {
    const stored = await this.cacheService.get<{
      userId: string;
      role: string;
    }>(`refresh:${refreshToken}`);

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: Number(stored.userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.cacheService.del(`refresh:${refreshToken}`);

    return this.generateTokenPair(user);
  }

  async logout(accessToken: string, refreshToken: string) {
    const payload = this.jwtService.decode<JwtPayload>(accessToken);

    const now = Math.floor(Date.now() / 1000);
    const remainingTtl = payload?.exp
      ? payload.exp - now
      : this.ACCESS_TOKEN_TTL;

    if (remainingTtl > 0) {
      await this.cacheService.set(
        `blacklist:${accessToken}`,
        '1',
        remainingTtl,
      );
    }

    await this.cacheService.del(`refresh:${refreshToken}`);
  }

  async getMe(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async generateTokenPair(user: User) {
    const payload: JwtPayload = {
      sub: String(user.id),
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: this.ACCESS_TOKEN_TTL,
    });
    const refreshToken = uuidv4();

    await this.cacheService.set(
      `refresh:${refreshToken}`,
      { userId: String(user.id) },
      this.REFRESH_TOKEN_TTL,
    );

    return { accessToken, refreshToken };
  }
  async sendOtp(
    mobile: string,
  ): Promise<{ action: 'login' | 'signup'; otp?: string }> {
    const rateKey = `otp:rate:${mobile}`;
    const attempts = (await this.cacheService.get<number>(rateKey)) ?? 0;

    if (attempts >= this.OTP_RATE_LIMIT) {
      throw new TooManyRequestsException(
        'Too many OTP requests. Try again in 10 minutes.',
      );
    }

    const user = await this.userRepository.findOne({ where: { mobile } });
    const action = user ? 'login' : 'signup';

    const otp = this.generateOtp();
    await this.cacheService.set(`otp:${mobile}`, otp, this.OTP_TTL);

    await this.cacheService.set(rateKey, attempts + 1, this.OTP_RATE_TTL);

    return { action, otp };
  }

  async verifyOtpLogin(mobile: string, otp: string) {
    await this.consumeOtp(mobile, otp);

    const user = await this.userRepository.findOne({ where: { mobile } });
    if (!user) {
      throw new NotFoundException('User not found. Please sign up.');
    }

    return this.generateTokenPair(user);
  }

  async verifyOtpSignup(dto: VerifyOtpSignupDto) {
    await this.consumeOtp(dto.mobile, dto.otp);

    const exists = await this.userRepository.findOne({
      where: [{ mobile: dto.mobile }, { name: dto.name }],
    });

    if (exists) {
      throw new ConflictException('Mobile or username already exists');
    }

    const user = this.userRepository.create({
      mobile: dto.mobile,
      name: dto.name,
      password: await generateHash(dto.password),
    });

    await this.userRepository.save(user);
    return this.generateTokenPair(user);
  }

  async updateMe(dto: UpdateMeDto, userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password', 'name', 'mobile', 'role'],
    });

    if (!user) throw new NotFoundException('User not found');

    if (dto.oldPassword || dto.newPassword) {
      if (!dto.oldPassword || !dto.newPassword) {
        throw new BadRequestException(
          'Both oldPassword and newPassword are required',
        );
      }

      if (dto.rePassword && dto.oldPassword !== dto.rePassword) {
        throw new BadRequestException('Passwords do not match');
      }

      const isMatch = await compareHash(dto.oldPassword, user.password);
      if (!isMatch)
        throw new UnauthorizedException('Old password is incorrect');

      user.password = await generateHash(dto.newPassword);
    }

    if (dto.name) {
      const exists = await this.userRepository.findOne({
        where: { name: dto.name },
      });
      if (exists && exists.id !== user.id) {
        throw new ConflictException('Username already taken');
      }
      user.name = dto.name;
    }

    await this.userRepository.save(user);

    const { password, ...result } = user;
    return result;
  }

  async forgotPassword(mobile: string) {
    const user = await this.userRepository.findOne({ where: { mobile } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rateKey = `otp:rate:${mobile}`;
    const attempts = (await this.cacheService.get<number>(rateKey)) ?? 0;

    if (attempts >= this.OTP_RATE_LIMIT) {
      throw new TooManyRequestsException(
        'Too many OTP requests. Try again in 10 minutes.',
      );
    }

    const otp = this.generateOtp();
    await this.cacheService.set(`otp:reset:${mobile}`, otp, this.OTP_TTL);
    await this.cacheService.set(rateKey, attempts + 1, this.OTP_RATE_TTL);

    return { otp };
  }

  async resetPassword(mobile: string, otp: string, newPassword: string) {
    const stored = await this.cacheService.get<string>(`otp:reset:${mobile}`);

    if (!stored || stored !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.userRepository.findOne({
      where: { mobile },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = await generateHash(newPassword);
    await this.userRepository.save(user);
    await this.cacheService.del(`otp:reset:${mobile}`);

    return this.generateTokenPair(user);
  }

  private async consumeOtp(mobile: string, otp: string): Promise<void> {
    const stored = await this.cacheService.get<string>(`otp:${mobile}`);

    if (!stored || stored !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.cacheService.del(`otp:${mobile}`);
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
