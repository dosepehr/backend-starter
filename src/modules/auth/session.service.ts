import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../users/entities/user.entity';
import { CacheService } from 'utils/cache/cache.service';
import { JwtPayload } from 'utils/interfaces/jwt-payload.interface';

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

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionExpiry: number;
}

@Injectable()
export class SessionService {
  private readonly ACCESS_TOKEN_TTL = 15 * 60;
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;
  private readonly MAX_SESSIONS_PER_USER = 5;
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

  async issueTokenPair(user: User, context?: RequestContext): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: String(user.id),
      role: user.role,
      tokenVersion: user.tokenVersion,
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
    await this.evictOldestBeyondCap(sessionsKey);

    const sessionExpiry = Math.floor(now / 1000) + this.ACCESS_TOKEN_TTL;

    return { accessToken, refreshToken, sessionExpiry };
  }

  async refresh(refreshToken: string, context?: RequestContext): Promise<TokenPair> {
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

    return this.issueTokenPair(user, context);
  }

  async logout(accessToken: string, refreshToken: string): Promise<void> {
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

  async revokeSession(userId: string, token: string): Promise<void> {
    const members = await this.cacheService.sMembers(`sessions:${userId}`);
    if (!members.includes(token)) {
      throw new NotFoundException('Session not found');
    }
    await this.cacheService.del(`refresh:${token}`);
    await this.cacheService.sRem(`sessions:${userId}`, token);
  }

  private async revokeAllSessions(userId: string): Promise<void> {
    const sessionsKey = `sessions:${userId}`;
    const tokens = await this.cacheService.sMembers(sessionsKey);
    for (const token of tokens) {
      await this.cacheService.del(`refresh:${token}`);
    }
    await this.cacheService.del(sessionsKey);
  }

  private async evictOldestBeyondCap(sessionsKey: string): Promise<void> {
    const allTokens = await this.cacheService.sMembers(sessionsKey);
    if (allTokens.length <= this.MAX_SESSIONS_PER_USER) return;

    const toEvict = allTokens.slice(0, allTokens.length - this.MAX_SESSIONS_PER_USER);
    for (const old of toEvict) {
      await this.cacheService.del(`refresh:${old}`);
    }
    await this.cacheService.sRem(sessionsKey, ...toEvict);
  }
}
