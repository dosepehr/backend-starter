import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { AppLogger } from 'utils/common/logger/logger.service';
import { REDIS_CONFIG, type RedisConfig } from './cache.config';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(
    @Inject(REDIS_CONFIG) private readonly config: RedisConfig,
    private readonly logger: AppLogger,
  ) {}

  // Lifecycle

  async onModuleInit(): Promise<void> {
    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      lazyConnect: true,
    });

    this.client.on('connect', () =>
      this.logger.log('Redis connection established', CacheService.name),
    );
    this.client.on('error', (err: Error) =>
      this.logger.error(
        `Redis error: ${err.message}`,
        err.stack,
        CacheService.name,
      ),
    );
    this.client.on('close', () =>
      this.logger.warn('Redis connection closed', CacheService.name),
    );

    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
    this.logger.log('Redis connection closed gracefully', CacheService.name);
  }

  // Core Methods

  /** Get a value by key. Returns null if not found. */
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  /** Set a value. Falls back to defaultTtl from config if ttl not provided. */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const expiry = ttl ?? this.config.defaultTtl;

    if (expiry > 0) {
      await this.client.set(key, serialized, 'EX', expiry);
    } else {
      await this.client.set(key, serialized);
    }
  }

  /** Delete one or more keys. */
  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    await this.client.del(...keys);
    keys.forEach((key) =>
      this.logger.log(`Cache DEL | key: "${key}"`, CacheService.name),
    );
  }

  /** Check if a key exists. */
  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) > 0;
  }

  /** Reset TTL of an existing key (seconds). */
  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
  }

  /**
   * Get remaining TTL of a key in seconds.
   * Returns -1 (no TTL) or -2 (key not found).
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * Get-or-set: return cached value, or call factory → cache → return.
   * - HIT  → returns cached value without calling factory
   * - MISS → calls factory, stores result in cache, then returns it
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      this.logger.log(`Cache HIT | key: "${key}"`, CacheService.name);
      return cached;
    }

    this.logger.log(`Cache MISS | key: "${key}"`, CacheService.name);

    const fresh = await factory();
    const expiry = ttl ?? this.config.defaultTtl;
    await this.set(key, fresh, expiry);

    this.logger.log(
      `Cache SET | key: "${key}" | TTL: ${expiry}s`,
      CacheService.name,
    );

    return fresh;
  }

  /**
   * Delete all keys matching a glob pattern (e.g. 'human:*').
   * Uses SCAN to avoid blocking in production.
   */
  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.scanKeys(pattern);
    if (keys.length === 0) return;

    await this.client.del(...keys);
    this.logger.log(
      `Cache DEL pattern: "${pattern}" | ${keys.length} key(s) removed`,
      CacheService.name,
    );
  }

  // Internal Helpers

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    const prefixedPattern = `${this.config.keyPrefix}${pattern}`;

    do {
      const [next, batch] = await this.client.scan(
        cursor,
        'MATCH',
        prefixedPattern,
        'COUNT',
        100,
      );
      cursor = next;
      keys.push(...batch.map((k) => k.slice(this.config.keyPrefix.length)));
    } while (cursor !== '0');

    return keys;
  }
}
