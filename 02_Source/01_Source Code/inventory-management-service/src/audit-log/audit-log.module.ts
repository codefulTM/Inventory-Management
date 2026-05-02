/**
 * AuditLogModule - Module ghi log kiểm toán bất biến
 *
 * Chức năng:
 * - Ghi lại mọi thay đổi dữ liệu quan trọng trong hệ thống
 * - Log kiểm toán bao gồm: ai làm, làm gì, khi nào, ở đâu, thay đổi gì
 * - Immutable - không thể sửa hoặc xóa log sau khi ghi
 * - Dùng cho compliance, traceability, và debugging
 *
 * Sử dụng: Inject AuditLogService vào bất kỳ service nào cần ghi log
 * Ví dụ: await auditLogService.log(username, AuditAction.USER_CREATED, ctx, { target: '...' })
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './audit-log.schema';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
