import { ConfigService } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTtl: number;
}

export const REDIS_CONFIG = Symbol('REDIS_CONFIG');

export function createRedisConfig(config: ConfigService): RedisConfig {
  return {
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: config.get<number>('REDIS_PORT', 6379),
    password: config.get<string>('REDIS_PASSWORD') || undefined,
    db: config.get<number>('REDIS_DB', 0),
    keyPrefix: config.get<string>('REDIS_KEY_PREFIX', 'app:'),
    defaultTtl: config.get<number>('REDIS_DEFAULT_TTL', 300),
  };
}
