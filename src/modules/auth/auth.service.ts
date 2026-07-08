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
import { randomInt } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { CacheService } from 'utils/cache/cache.service';
import { JwtPayload } from 'utils/interfaces/jwt-payload.interface';
import { compareHash, generateHash } from 'utils/funcs/password';
import { TooManyRequestsException } from 'utils/exceptions/too-many-requests.exception';
import { UpdateMeDto } from './dto/update-me.dto';
import { SignupDetailsDto } from './dto/signup-details.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';

interface SignupData {
  name: string;
  password: string;
}

interface SessionMetadata {
  userId: string;
  ip: string;
  userAgent: string;
  createdAt: number;
  lastUsedAt: number;
}

export interface RequestContext {
  ip: string;
  userAgent: string;
}

type OtpType = 'login' | 'signup';

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_TTL = 15 * 60;
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;
  private readonly MAX_SESSIONS_PER_USER = 5;
  private readonly jwtSecret: string;

  private readonly OTP_TTL = 2 * 60;
  private readonly SIGNUP_DATA_TTL = 10 * 60;
  private readonly OTP_RATE_TTL = 10 * 60;
  private readonly OTP_RATE_LIMIT = 3;

  private readonly LOGIN_FAIL_TTL = 15 * 60;
  private readonly LOGIN_FAIL_LIMIT = 5;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
  }

  async checkMobile(mobile: string) {
    const user = await this.userRepository.findOne({ where: { mobile } });

    if (user) {
      await this.checkOtpRateLimit(mobile);

      const otp = this.generateOtp();
      await this.cacheService.set(`otp:login:${mobile}`, otp, this.OTP_TTL);

      await this.incrementOtpRate(mobile);

      return {
        action: 'login' as const,
        message: 'User exists. OTP sent for login.',
        // TODO: stop returning the OTP in the response body — deliver it via SMS only.
        otp,
      };
    }

    return {
      action: 'signup' as const,
      message: 'User not found. Please signup.',
    };
  }

  async resendOtp(mobile: string, type: OtpType) {
    await this.checkOtpRateLimit(mobile);

    if (type === 'login') {
      const user = await this.userRepository.findOne({ where: { mobile } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const otp = this.generateOtp();
      await this.cacheService.set(`otp:login:${mobile}`, otp, this.OTP_TTL);

      await this.incrementOtpRate(mobile);

      // TODO: stop returning the OTP in the response body — deliver it via SMS only.
      return { message: 'OTP resent successfully', otp };
    }

    if (type === 'signup') {
      const userExists = await this.userRepository.findOne({ where: { mobile } });
      if (userExists) {
        throw new ConflictException('Mobile is already registered');
      }

      const signupData = await this.cacheService.get<SignupData>(
        `signup:${mobile}`,
      );

      if (!signupData) {
        throw new NotFoundException(
          'Signup data not found. Please complete signup details first.',
        );
      }

      const otp = this.generateOtp();
      await this.cacheService.set(`otp:signup:${mobile}`, otp, this.OTP_TTL);

      await this.incrementOtpRate(mobile);

      // TODO: stop returning the OTP in the response body — deliver it via SMS only.
      return { message: 'OTP resent successfully', otp };
    }

    throw new BadRequestException('Invalid OTP type');
  }

  async login(dto: LoginDto, context?: RequestContext) {
    const lockKey = `login:fail:${dto.mobile}`;
    const failures = (await this.cacheService.get<number>(lockKey)) ?? 0;
    if (failures >= this.LOGIN_FAIL_LIMIT) {
      throw new TooManyRequestsException(
        'Account temporarily locked. Try again in 15 minutes.',
      );
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.mobile = :mobile', { mobile: dto.mobile })
      .addSelect('user.password')
      .getOne();

    if (!user || !(await compareHash(dto.password, user.password))) {
      await this.cacheService.set(lockKey, failures + 1, this.LOGIN_FAIL_TTL);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.cacheService.del(lockKey);
    return this.generateTokenPair(user, context);
  }
  async verifyOtpLogin(mobile: string, otp: string, context?: RequestContext) {
    const storedOtp = await this.cacheService.get<string>(
      `otp:login:${mobile}`,
    );

    if (!storedOtp || storedOtp !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.userRepository.findOne({ where: { mobile } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.cacheService.del(`otp:login:${mobile}`);

    return this.generateTokenPair(user, context);
  }

  async saveSignupDetails(dto: SignupDetailsDto) {
    const userExists = await this.userRepository.findOne({
      where: [{ mobile: dto.mobile }, { name: dto.name }],
    });

    if (userExists) {
      throw new ConflictException('Mobile or username already exists');
    }

    await this.checkOtpRateLimit(dto.mobile);

    const signupData: SignupData = {
      name: dto.name,
      password: await generateHash(dto.password),
    };

    await this.cacheService.set(
      `signup:${dto.mobile}`,
      signupData,
      this.SIGNUP_DATA_TTL,
    );

    const otp = this.generateOtp();
    await this.cacheService.set(`otp:signup:${dto.mobile}`, otp, this.OTP_TTL);

    await this.incrementOtpRate(dto.mobile);

    // TODO: stop returning the OTP in the response body — deliver it via SMS only.
    return {
      message: 'Registration data saved and OTP sent successfully',
      otp,
    };
  }

  async completeSignup(dto: CompleteSignupDto, context?: RequestContext) {
    const storedOtp = await this.cacheService.get<string>(
      `otp:signup:${dto.mobile}`,
    );

    if (!storedOtp || storedOtp !== dto.otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const signupData = await this.cacheService.get<SignupData>(
      `signup:${dto.mobile}`,
    );

    if (!signupData) {
      throw new NotFoundException(
        'Registration data not found or expired. Please complete signup details again.',
      );
    }

    const userExists = await this.userRepository.findOne({
      where: [{ mobile: dto.mobile }, { name: signupData.name }],
    });

    if (userExists) {
      throw new ConflictException('Mobile or username already exists');
    }

    const user = this.userRepository.create({
      mobile: dto.mobile,
      name: signupData.name,
      password: signupData.password,
    });

    await this.userRepository.save(user);

    await this.cacheService.del(`otp:signup:${dto.mobile}`);
    await this.cacheService.del(`signup:${dto.mobile}`);

    return this.generateTokenPair(user, context);
  }

  async refresh(refreshToken: string, context?: RequestContext) {
    const stored = await this.cacheService.get<SessionMetadata>(
      `refresh:${refreshToken}`,
    );

    if (!stored) {
      const reusedUserId = await this.cacheService.get<string>(
        `refresh:used:${refreshToken}`,
      );
      if (reusedUserId) {
        // Token was already rotated away and is being presented again —
        // treat as a stolen-token signal and kill the entire session family.
        await this.revokeAllSessions(reusedUserId);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: parseInt(stored.userId, 10) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.cacheService.del(`refresh:${refreshToken}`);
    await this.cacheService.sRem(`sessions:${stored.userId}`, refreshToken);
    // Tombstone the consumed token so a replay can be detected after rotation.
    await this.cacheService.set(
      `refresh:used:${refreshToken}`,
      stored.userId,
      this.REFRESH_TOKEN_TTL,
    );

    return this.generateTokenPair(user, context);
  }

  private async revokeAllSessions(userId: string): Promise<void> {
    const sessionsKey = `sessions:${userId}`;
    const tokens = await this.cacheService.sMembers(sessionsKey);
    for (const token of tokens) {
      await this.cacheService.del(`refresh:${token}`);
    }
    await this.cacheService.del(sessionsKey);
  }

  async logout(accessToken: string, refreshToken: string) {
    const payload = this.jwtService.decode<JwtPayload>(accessToken);

    const now = Math.floor(Date.now() / 1000);
    const remainingTtl = payload?.exp
      ? Math.max(payload.exp - now, 0)
      : this.ACCESS_TOKEN_TTL;

    // Always blacklist — even if already expired, a brief entry prevents
    // any replay within the same second. Uses a floor of 1 so Redis accepts
    // the TTL (0 would persist forever).
    await this.cacheService.set(
      `blacklist:${accessToken}`,
      '1',
      Math.max(remainingTtl, 1),
    );

    const stored = await this.cacheService.get<{ userId: string }>(
      `refresh:${refreshToken}`,
    );
    await this.cacheService.del(`refresh:${refreshToken}`);
    if (stored?.userId) {
      await this.cacheService.sRem(`sessions:${stored.userId}`, refreshToken);
    }

    return { message: 'Logged out successfully' };
  }

  async getSessions(userId: string) {
    const tokens = await this.cacheService.sMembers(`sessions:${userId}`);

    const sessions = await Promise.all(
      tokens.map(async (token) => {
        const metadata = await this.cacheService.get<SessionMetadata>(
          `refresh:${token}`,
        );
        return {
          token,
          ip: metadata?.ip ?? 'unknown',
          userAgent: metadata?.userAgent ?? 'unknown',
          createdAt: metadata?.createdAt
            ? new Date(metadata.createdAt).toISOString()
            : null,
          lastUsedAt: metadata?.lastUsedAt
            ? new Date(metadata.lastUsedAt).toISOString()
            : null,
        };
      }),
    );

    return { count: sessions.length, sessions };
  }

  async revokeSession(userId: string, token: string) {
    const members = await this.cacheService.sMembers(`sessions:${userId}`);
    if (!members.includes(token)) {
      throw new NotFoundException('Session not found');
    }
    await this.cacheService.del(`refresh:${token}`);
    await this.cacheService.sRem(`sessions:${userId}`, token);
    return { message: 'Session revoked' };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: parseInt(userId, 10) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async forgotPassword(mobile: string) {
    const user = await this.userRepository.findOne({ where: { mobile } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.checkOtpRateLimit(mobile);

    const otp = this.generateOtp();
    await this.cacheService.set(`otp:reset:${mobile}`, otp, this.OTP_TTL);

    await this.incrementOtpRate(mobile);

    // TODO: stop returning the OTP in the response body — deliver it via SMS only.
    return { message: 'OTP sent successfully', otp };
  }

  async updateMe(dto: UpdateMeDto, userId: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id: parseInt(userId, 10) })
      .addSelect('user.password')
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    if (dto.oldPassword || dto.newPassword) {
      if (!dto.oldPassword || !dto.newPassword) {
        throw new BadRequestException(
          'Both oldPassword and newPassword are required',
        );
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

    if (dto.email !== undefined) {
      if (dto.email) {
        const exists = await this.userRepository.findOne({
          where: { email: dto.email },
        });
        if (exists && exists.id !== user.id) {
          throw new ConflictException('Email already taken');
        }
      }
      user.email = dto.email ?? null;
    }

    await this.userRepository.save(user);

    return user;
  }

  async resetPassword(
    mobile: string,
    otp: string,
    newPassword: string,
    context?: RequestContext,
  ) {
    const stored = await this.cacheService.get<string>(`otp:reset:${mobile}`);

    if (!stored || stored !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.mobile = :mobile', { mobile })
      .addSelect('user.password')
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = await generateHash(newPassword);
    await this.userRepository.save(user);
    await this.cacheService.del(`otp:reset:${mobile}`);

    return this.generateTokenPair(user, context);
  }

  private async generateTokenPair(user: User, context?: RequestContext) {
    const payload: JwtPayload = {
      sub: String(user.id),
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: this.ACCESS_TOKEN_TTL,
    });
    const refreshToken = uuidv4();
    const userId = String(user.id);
    const sessionsKey = `sessions:${userId}`;
    const now = Date.now();

    const metadata: SessionMetadata = {
      userId,
      ip: context?.ip ?? 'unknown',
      userAgent: context?.userAgent ?? 'unknown',
      createdAt: now,
      lastUsedAt: now,
    };

    await this.cacheService.set(
      `refresh:${refreshToken}`,
      metadata,
      this.REFRESH_TOKEN_TTL,
    );

    await this.cacheService.sAdd(sessionsKey, refreshToken);
    await this.cacheService.expire(sessionsKey, this.REFRESH_TOKEN_TTL);

    // Evict oldest sessions when cap is exceeded
    const allTokens = await this.cacheService.sMembers(sessionsKey);
    if (allTokens.length > this.MAX_SESSIONS_PER_USER) {
      const toEvict = allTokens.slice(0, allTokens.length - this.MAX_SESSIONS_PER_USER);
      for (const old of toEvict) {
        await this.cacheService.del(`refresh:${old}`);
      }
      await this.cacheService.sRem(sessionsKey, ...toEvict);
    }

    return { accessToken, refreshToken };
  }

  private async checkOtpRateLimit(mobile: string): Promise<void> {
    const rateKey = `otp:rate:${mobile}`;
    const attempts = (await this.cacheService.get<number>(rateKey)) ?? 0;

    if (attempts >= this.OTP_RATE_LIMIT) {
      throw new TooManyRequestsException(
        'Too many OTP requests. Try again in 10 minutes.',
      );
    }
  }

  private async incrementOtpRate(mobile: string): Promise<void> {
    const rateKey = `otp:rate:${mobile}`;
    const attempts = (await this.cacheService.get<number>(rateKey)) ?? 0;
    await this.cacheService.set(rateKey, attempts + 1, this.OTP_RATE_TTL);
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }
}
