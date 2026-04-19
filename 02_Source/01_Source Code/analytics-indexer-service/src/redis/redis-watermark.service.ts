import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const KEY_PREFIX = 'analytics:watermark';

@Injectable()
export class RedisWatermarkService {
  private readonly logger = new Logger(RedisWatermarkService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Returns the stored watermark Date for a collection, or null if none exists
   * (first-ever run — full historical sync).
   */
  async getWatermark(collection: string): Promise<Date | null> {
    const key = `${KEY_PREFIX}:${collection}`;
    const value = await this.redis.get(key);
    if (!value) return null;
    const ts = new Date(value);
    if (isNaN(ts.getTime())) {
      this.logger.warn(`Invalid watermark stored for ${collection}: "${value}"`);
      return null;
    }
    return ts;
  }

  /**
   * Saves the watermark timestamp for a collection.
   * Called ONLY after a successful sync cycle.
   */
  async setWatermark(collection: string, ts: Date): Promise<void> {
    const key = `${KEY_PREFIX}:${collection}`;
    await this.redis.set(key, ts.toISOString());
    this.logger.debug(`Watermark updated — ${collection}: ${ts.toISOString()}`);
  }

  async getAllWatermarks(
    collections?: string[],
  ): Promise<Record<string, string | null>> {
    const keys =
      collections && collections.length > 0
        ? collections.map((collection) => `${KEY_PREFIX}:${collection}`)
        : await this.redis.keys(`${KEY_PREFIX}:*`);

    if (keys.length === 0) {
      return {};
    }

    const values = await this.redis.mget(...keys);
    const result: Record<string, string | null> = {};

    keys.forEach((key, index) => {
      const collection = key.replace(`${KEY_PREFIX}:`, '');
      result[collection] = values[index] ?? null;
    });

    return result;
  }

  async resetWatermarks(collections?: string[]): Promise<number> {
    const keys =
      collections && collections.length > 0
        ? collections.map((collection) => `${KEY_PREFIX}:${collection}`)
        : await this.redis.keys(`${KEY_PREFIX}:*`);

    if (keys.length === 0) {
      return 0;
    }

    return this.redis.del(...keys);
  }
}
