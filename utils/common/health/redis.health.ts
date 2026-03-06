import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { CacheService } from 'utils/cache/cache.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly cacheService: CacheService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await this.cacheService.ping();
      return indicator.up();
    } catch (err) {
      return indicator.down({ message: err.message });
    }
  }
}
