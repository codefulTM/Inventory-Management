import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisWatermarkService } from './redis-watermark.service';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const host = config.get<string>('redis.host');
        const port = config.get<number>('redis.port');
        const password = config.get<string>('redis.password');
        const tls = config.get<boolean>('redis.tls');

        return new Redis({
          host,
          port,
          ...(password ? { password } : {}),
          ...(tls ? { tls: {} } : {}),
          lazyConnect: false,
        });
      },
    },
    RedisWatermarkService,
  ],
  exports: [REDIS_CLIENT, RedisWatermarkService],
})
export class RedisModule {}
