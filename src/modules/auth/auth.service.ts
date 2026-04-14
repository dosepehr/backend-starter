import {
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

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_TTL = 15 * 60;
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;
  private readonly jwtSecret: string;

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

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password: _, ...safeUser } = user;
    return safeUser;
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
}
