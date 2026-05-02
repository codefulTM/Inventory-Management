/**
 * File: redis/redis.module.ts
 * Mục đích: Module quản lý kết nối Redis và cung cấp các dịch vụ liên quan đến Redis
 * 
 * Module này được đánh dấu @Global() để có thể sử dụng ở bất kỳ đâu trong ứng dụng
 * - Khởi tạo Redis client với cấu hình từ ConfigService
 * - Cung cấp RedisWatermarkService để quản lý watermark đồng bộ
 */
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisWatermarkService } from './redis-watermark.service';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    // Provider cho Redis client - sử dụng ioredis library
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        // Đọc cấu hình từ environment variables thông qua ConfigService
        const host = config.get<string>('redis.host');
        const port = config.get<number>('redis.port');
        const password = config.get<string>('redis.password');
        const tls = config.get<boolean>('redis.tls');

        // Khởi tạo Redis client với các tùy chọn cấu hình
        return new Redis({
          host,
          port,
          // Chỉ thêm password nếu có cấu hình
          ...(password ? { password } : {}),
          // Chỉ bật TLS nếu được cấu hình
          ...(tls ? { tls: {} } : {}),
          // lazyConnect: false - kết nối ngay khi khởi tạo
          lazyConnect: false,
        });
      },
    },
    // Service quản lý watermark đồng bộ
    RedisWatermarkService,
  ],
  // Export cả REDIS_CLIENT và RedisWatermarkService để các module khác có thể sử dụng
  exports: [REDIS_CLIENT, RedisWatermarkService],
})
export class RedisModule {}
