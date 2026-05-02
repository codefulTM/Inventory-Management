/**
 * LogModule - Module quản lý log ứng dụng
 *
 * Chức năng:
 * - Lưu trữ log ứng dụng vào MongoDB collection 'app_logs'
 * - Schema động định nghĩa trực tiếp trong module (không dùng file schema riêng)
 * - Các trường log: level, message, error_code, session_id, user, module, stack
 * - Cung cấp API để truy vấn và tìm kiếm log
 * - Dùng cho debugging và theo dõi lỗi hệ thống
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogService } from './log.service';
import { LogController } from './log.controller';
import { Schema } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'AppLog',
        schema: new Schema(
          {
            level: String,
            message: String,
            error_code: String,
            session_id: String,
            user: String,
            module: String,
            stack: String,
            created_at: { type: Date, default: Date.now },
          },
          { collection: 'app_logs' },
        ),
      },
    ]),
  ],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}
