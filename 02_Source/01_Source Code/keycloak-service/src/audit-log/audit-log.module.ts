/**
 * File: audit-log.module.ts
 * Mô tả: Module quản lý audit log — nhật ký kiểm toán các hành động quan trọng.
 *
 * Chức năng:
 * - Đăng ký AuditLog schema với Mongoose (collection: 'audit_logs')
 * - Cung cấp AuditLogService để ghi log và truy vấn audit log
 * - Export AuditLogService để các module khác (AuthModule, UserModule) có thể ghi log
 *
 * Audit log được sử dụng để:
 * - Theo dõi ai đã làm gì, khi nào, từ đâu (IP)
 * - Phân tích sự cố và điều tra bảo mật
 * - Tuân thủ yêu cầu kiểm toán (compliance)
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './audit-log.schema';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [
    // Đăng ký schema AuditLog với Mongoose
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  providers: [AuditLogService],
  exports: [AuditLogService], // Export để các module khác (Auth, User) có thể ghi log
})
export class AuditLogModule {}
