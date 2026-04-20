import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { createHash } from 'node:crypto';
import { REDIS_CLIENT } from '../redis/redis.constants';

const KEY_PREFIX = 'analytics:rag:embedding';

@Injectable()
export class RedisEmbeddingCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  getCacheKey(model: string, text: string): string {
    const hash = createHash('sha256').update(text).digest('hex');
    return `${KEY_PREFIX}:${model}:${hash}`;
  }

  async get(model: string, text: string): Promise<number[] | null> {
    const key = this.getCacheKey(model, text);
    const value = await this.redis.get(key);
    if (!value) return null;

    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return null;
      return parsed.filter((item) => typeof item === 'number');
    } catch {
      return null;
    }
  }

  async set(
    model: string,
    text: string,
    embedding: number[],
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.getCacheKey(model, text);
    await this.redis.set(key, JSON.stringify(embedding), 'EX', ttlSeconds);
  }
}
