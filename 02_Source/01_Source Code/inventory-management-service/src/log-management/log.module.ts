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
    // Đăng ký schema AppLog với Mongoose để có thể inject Model<AppLog> qua @InjectModel('AppLog')
    MongooseModule.forFeature([
      {
        name: 'AppLog', // Tên model sử dụng để inject
        schema: new Schema(
          {
            // Mức độ log: info, warn, error, debug
            level: String,
            // Nội dung thông báo log
            message: String,
            // Mã lỗi (tùy chọn)
            error_code: String,
            // ID phiên làm việc
            session_id: String,
            // Người dùng thực hiện hành động
            user: String,
            // Module phát sinh log
            module: String,
            // Stack trace (dành cho lỗi error)
            stack: String,
            // Thời gian tạo log, mặc định là thời điểm hiện tại
            created_at: { type: Date, default: Date.now },
          },
          // Chỉ định tên collection trong MongoDB là 'app_logs'
          { collection: 'app_logs' },
        ),
      },
    ]),
  ],
  // Đăng ký controller xử lý các route /logs
  controllers: [LogController],
  // Đăng ký service để xử lý logic nghiệp vụ
  providers: [LogService],
  // Export LogService để các module khác có thể sử dụng (ví dụ: ghi log từ module khác)
  exports: [LogService],
})
export class LogModule {}
