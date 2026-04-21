import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  IdPrefix,
  REDIS_ID_CLIENT,
  REDIS_ID_KEY_MAP,
} from './redis-id.constants';

/**
 * RedisIdService - Generates auto-incrementing unique IDs using Redis INCR.
 *
 * Uses Redis db 1 (separate from analytics-indexer which uses db 0).
 * ID format: `{PREFIX}-{n}` (e.g. MAT-1, LOT-42)
 * Sample/init data format: `EX-{PREFIX}-{n}` (e.g. EX-MAT-1)
 */
@Injectable()
export class RedisIdService {
  private readonly logger = new Logger(RedisIdService.name);

  constructor(@Inject(REDIS_ID_CLIENT) private readonly redis: Redis) {}

  /**
   * Generate next ID for the given prefix.
   * Atomically increments a Redis counter and returns `{PREFIX}-{n}`.
   */
  async nextId(prefix: IdPrefix): Promise<string> {
    const key = REDIS_ID_KEY_MAP[prefix];
    const n = await this.redis.incr(key);
    const id = `${prefix}-${n}`;
    this.logger.debug(`Generated ID: ${id}`);
    return id;
  }

  /**
   * Generate sample/init ID for the given prefix.
   * Format: `EX-{PREFIX}-{n}` (e.g. EX-MAT-1)
   */
  async nextSampleId(prefix: IdPrefix): Promise<string> {
    const id = await this.nextId(prefix);
    return `EX-${id}`;
  }

  /**
   * Peek at the current counter value without incrementing.
   */
  async currentCounter(prefix: IdPrefix): Promise<number> {
    const key = REDIS_ID_KEY_MAP[prefix];
    const val = await this.redis.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  /**
   * Reset a counter (useful for testing / re-seeding).
   */
  async resetCounter(prefix: IdPrefix, value = 0): Promise<void> {
    const key = REDIS_ID_KEY_MAP[prefix];
    await this.redis.set(key, value);
  }
}
