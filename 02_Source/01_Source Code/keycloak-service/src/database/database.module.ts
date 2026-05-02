/**
 * File: database.module.ts
 * Mô tả: Module cấu hình kết nối cơ sở dữ liệu MongoDB sử dụng Mongoose ODM.
 *
 * Chức năng:
 * - Thiết lập kết nối đến MongoDB từ biến môi trường MONGODB_URI
 * - Sử dụng forRootAsync để có thể inject ConfigService lấy connection string
 * - Nếu không cấu hình MONGODB_URI, mặc định kết nối đến mongodb://localhost:27017/inventory
 *
 * Lưu ý: Module này chỉ cấu hình kết nối, các schema/model sẽ được đăng ký
 * trong từng feature module cụ thể (UserModule, AuditLogModule, etc.)
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Lấy MongoDB URI từ environment variable, fallback về localhost
        uri: config.get<string>('MONGODB_URI', 'mongodb://localhost:27017/inventory'),
      }),
    }),
  ],
})
export class DatabaseModule {}
