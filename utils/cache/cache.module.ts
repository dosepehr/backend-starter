import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { createRedisConfig, REDIS_CONFIG } from './cache.config';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CONFIG,
      inject: [ConfigService],
      useFactory: createRedisConfig,
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
