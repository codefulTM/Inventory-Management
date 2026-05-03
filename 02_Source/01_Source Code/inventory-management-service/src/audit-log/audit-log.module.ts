/**
 * AuditLogModule - Module quản lý nhật ký kiểm toán (audit log) bất biến
 *
 * Chức năng chính:
 * - Ghi lại mọi thay đổi dữ liệu quan trọng trong hệ thống
 * - Log kiểm toán bao gồm: ai thực hiện, hành động gì, thời gian, từ đâu, thay đổi những gì
 * - Đặc tính Immutable: không thể sửa đổi hoặc xóa log sau khi đã ghi (đảm bảo tính toàn vẹn)
 * - Được sử dụng cho mục đích tuân thủ (compliance), truy vết (traceability), và gỡ lỗi (debugging)
 *
 * Cách sử dụng:
 * - Tiêm (inject) AuditLogService vào bất kỳ service nào cần ghi log
 * - Ví dụ: await auditLogService.log(username, AuditAction.USER_CREATED, ctx, { target: '...' })
 */
import { Module } from '@nestjs/common';
// Import MongooseModule để đăng ký schema với MongoDB
import { MongooseModule } from '@nestjs/mongoose';
// Import schema và model của AuditLog
import { AuditLog, AuditLogSchema } from './audit-log.schema';
// Import service xử lý logic nghiệp vụ
import { AuditLogService } from './audit-log.service';
// Import controller xử lý các API endpoint
import { AuditLogController } from './audit-log.controller';

@Module({
  // Đăng ký schema AuditLog với Mongoose để có thể sử dụng trong module
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  // Đăng ký controller để xử lý các route liên quan đến audit-log
  controllers: [AuditLogController],
  // Đăng ký service để sử dụng trong module và các module khác
  providers: [AuditLogService],
  // Export service để các module khác có thể sử dụng khi import AuditLogModule
  exports: [AuditLogService],
})
export class AuditLogModule {}
