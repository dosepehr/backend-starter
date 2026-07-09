import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { CacheService } from 'utils/cache/cache.service';
import { TooManyRequestsException } from 'utils/exceptions/too-many-requests.exception';

export type OtpPurpose = 'login' | 'signup' | 'reset';

@Injectable()
export class OtpService {
  private readonly OTP_TTL = 2 * 60;
  private readonly OTP_RATE_TTL = 10 * 60;
  private readonly OTP_RATE_LIMIT = 3;

  constructor(private readonly cacheService: CacheService) {}

  /** Generates and stores a fresh OTP for the given purpose, enforcing the per-mobile rate limit. Returns the OTP. */
  async issue(purpose: OtpPurpose, mobile: string): Promise<string> {
    await this.checkRateLimit(mobile);

    const otp = this.generate();
    await this.cacheService.set(this.otpKey(purpose, mobile), otp, this.OTP_TTL);
    await this.incrementRate(mobile);

    return otp;
  }

  /** Verifies the OTP matches what was issued; throws nothing — caller decides how to react to a false result. */
  async verify(purpose: OtpPurpose, mobile: string, otp: string): Promise<boolean> {
    const stored = await this.cacheService.get<string>(
      this.otpKey(purpose, mobile),
    );
    return !!stored && stored === otp;
  }

  async clear(purpose: OtpPurpose, mobile: string): Promise<void> {
    await this.cacheService.del(this.otpKey(purpose, mobile));
  }

  async checkRateLimit(mobile: string): Promise<void> {
    const rateKey = `otp:rate:${mobile}`;
    const attempts = (await this.cacheService.get<number>(rateKey)) ?? 0;

    if (attempts >= this.OTP_RATE_LIMIT) {
      throw new TooManyRequestsException(
        'Too many OTP requests. Try again in 10 minutes.',
      );
    }
  }

  private async incrementRate(mobile: string): Promise<void> {
    const rateKey = `otp:rate:${mobile}`;
    const attempts = (await this.cacheService.get<number>(rateKey)) ?? 0;
    await this.cacheService.set(rateKey, attempts + 1, this.OTP_RATE_TTL);
  }

  private generate(): string {
    return randomInt(100000, 1000000).toString();
  }

  private otpKey(purpose: OtpPurpose, mobile: string): string {
    return `otp:${purpose}:${mobile}`;
  }
}
