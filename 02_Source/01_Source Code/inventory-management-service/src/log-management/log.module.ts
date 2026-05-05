// === LOG MODULE ===
// Module quản lý log ứng dụng
// Chức năng:
// - Lưu trữ log ứng dụng vào MongoDB collection 'app_logs'
// - Schema động định nghĩa trực tiếp trong module (không dùng file schema riêng)
// - Các trường log: level, message, error_code, session_id, user, module, stack, created_at
// - Cung cấp API để truy vấn và tìm kiếm log
// - Dùng cho debugging và theo dõi lỗi hệ thống
// Export LogService để các module khác sử dụng (ví dụ: ghi log từ module khác)

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogService } from './log.service';
import { LogController } from './log.controller';
import { Schema } from 'mongoose';

@Module({
  imports: [
    // Đăng ký schema AppLog với Mongoose
    // Inject Model<AppLog> via @InjectModel('AppLog')
    MongooseModule.forFeature([
      {
        name: 'AppLog',
        schema: new Schema(
          {
            level: String,          // info, warn, error, debug
            message: String,       // nội dung thông báo
            error_code: String,     // mã lỗi (tùy chọn)
            session_id: String,    // ID phiên làm việc
            user: String,           // người dùng thực hiện
            module: String,         // module phát sinh log
            stack: String,         // stack trace (cho lỗi error)
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