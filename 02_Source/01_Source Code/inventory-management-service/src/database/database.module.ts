import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { mongooseConfigFactory } from './mongoose.config';

/**
 * Module cung cấp kết nối MongoDB cho toàn bộ ứng dụng.
 *
 * - `ConfigModule` được import để cho phép sử dụng `ConfigService` trong
 *   factory.
 * - `MongooseModule.forRootAsync` sử dụng hàm factory từ mongoose.config.ts
 *   và inject `ConfigService` để đọc biến môi trường an toàn.
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: mongooseConfigFactory,
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
