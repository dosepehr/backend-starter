import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { CacheService } from 'utils/cache/cache.service';
import { JwtPayload } from 'utils/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  // TTL ها به ثانیه
  private readonly ACCESS_TOKEN_TTL = 15 * 60;          // 15 دقیقه
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 روز

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Register ─────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const exists = await this.userRepository.findOne({
      where: [{ mobile: dto.mobile }, { name: dto.name }],
    });

    if (exists) {
      throw new ConflictException('Mobile or username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    return this.generateTokenPair(user);
  }

  // ─── Login ────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: [{ mobile: dto.identifier }, { name: dto.identifier }],
    });

    // پیام عمداً مبهم است تا اطلاعات leak نشه
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokenPair(user);
  }

  // ─── Refresh ──────────────────────────────────────────────────

  async refresh(refreshToken: string) {
    // بررسی وجود در Redis
    const storedData = await this.cacheService.get<{
      userId: string;
      role: string;
    }>(`refresh:${refreshToken}`);

    if (!storedData) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // پیدا کردن کاربر
    const user = await this.userRepository.findOne({
      where: { id: Number(storedData.userId) },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // حذف refresh token قدیمی (rotation)
    await this.cacheService.del(`refresh:${refreshToken}`);

    // صدور توکن‌های جدید
    return this.generateTokenPair(user);
  }

  // ─── Logout ───────────────────────────────────────────────────

  async logout(accessToken: string, refreshToken: string) {
    // decode بدون verify تا حتی توکن expire شده هم کار کنه
    const payload = this.jwtService.decode<JwtPayload>(accessToken);

    // محاسبه زمان باقیمانده برای blacklist
    const now = Math.floor(Date.now() / 1000);
    const remainingTtl = payload?.exp ? payload.exp - now : this.ACCESS_TOKEN_TTL;

    if (remainingTtl > 0) {
      await this.cacheService.set(
        `blacklist:${accessToken}`,
        '1',
        remainingTtl,
      );
    }

    // حذف refresh token
    await this.cacheService.del(`refresh:${refreshToken}`);

    return { message: 'Logged out successfully' };
  }

  // ─── Get Me ───────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  // ─── Private ──────────────────────────────────────────────────

  private async generateTokenPair(user: User) {
    const payload: JwtPayload = {
      sub: String(user.id),
      role: user.role,
    };

    const secret = this.configService.getOrThrow<string>('JWT_SECRET');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret,
        expiresIn: this.ACCESS_TOKEN_TTL,
      }),
      // refresh token یک UUID ساده است
      Promise.resolve(uuidv4()),
    ]);

    // ذخیره refresh token در Redis
    await this.cacheService.set(
      `refresh:${refreshToken}`,
      { userId: String(user.id), role: user.role },
      this.REFRESH_TOKEN_TTL,
    );

    return { accessToken, refreshToken };
  }
}
