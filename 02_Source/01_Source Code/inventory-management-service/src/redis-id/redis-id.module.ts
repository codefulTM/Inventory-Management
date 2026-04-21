import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_ID_CLIENT } from './redis-id.constants';
import { RedisIdService } from './redis-id.service';

/**
 * RedisIdModule - Provides Redis-based auto-ID generation.
 *
 * Connects to Redis db 1 (db 0 is reserved for analytics-indexer).
 * Reads REDIS_HOST, REDIS_PORT, REDIS_PASSWORD env vars.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_ID_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const host = config.get<string>('REDIS_HOST') || 'localhost';
        const port = config.get<number>('REDIS_PORT') || 6379;
        const password = config.get<string>('REDIS_PASSWORD');

        return new Redis({
          host,
          port,
          db: 1, // db 1 for inventory-management ID counters
          ...(password ? { password } : {}),
          lazyConnect: false,
          retryStrategy: (times: number) => Math.min(times * 100, 3000),
        });
      },
    },
    RedisIdService,
  ],
  exports: [RedisIdService],
})
export class RedisIdModule {}
