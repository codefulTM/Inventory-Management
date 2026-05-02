/**
 * DatabaseModule - Module quản lý kết nối cơ sở dữ liệu MongoDB
 * 
 * Chức năng chính:
 * - Thiết lập kết nối đến MongoDB sử dụng Mongoose ODM
 * - Sử dụng forRootAsync để đọc cấu hình từ ConfigService (env variables)
 * - Export MongooseModule để các module khác có thể inject các Model
 * 
 * Các module khác khi import DatabaseModule sẽ có thể sử dụng:
 * - @InjectModel() decorator để lấy Mongoose Model
 * - Thực hiện các thao tác CRUD với MongoDB
 * 
 * Cấu hình kết nối được định nghĩa trong mongoose.config.ts
 */
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { mongooseConfigFactory } from './mongoose.config';

@Module({
  imports: [
    // Khởi tạo Mongoose với cấu hình bất đồng bộ (async)
    // Sử dụng factory function để đọc URI từ ConfigService
    MongooseModule.forRootAsync({
      useFactory: mongooseConfigFactory,
      inject: [ConfigService], // Inject ConfigService vào factory
    }),
  ],
  // Export MongooseModule để các module khác import DatabaseModule có thể dùng được Model
  exports: [MongooseModule],
})
export class DatabaseModule {}
