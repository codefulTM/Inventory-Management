/**
 * File: user.module.ts
 * Mô tả: Module quản lý user trong MongoDB local.
 *
 * Chức năng:
 * - Cung cấp UserRepository để truy cập dữ liệu (CRUD operations)
 * - Cung cấp UserService để xử lý business logic liên quan đến user
 * - Import MailModule để gửi email (khi tạo user mới)
 * - Import AuditLogModule để ghi log các hành động (tạo, sửa, xóa user)
 *
 * Lưu ý: Module này không import KeycloakModule vì KeycloakService
 * được đánh dấu @Global() nên có thể inject ở bất kỳ đâu.
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { MailModule } from '../mail/mail.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    // Đăng ký User schema với Mongoose
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MailModule,       // Để gửi email khi tạo user mới
    AuditLogModule,   // Để ghi log các hành động của user
  ],
  providers: [UserRepository, UserService],
  exports: [UserService, UserRepository], // Export để AuthModule có thể sử dụng
})
export class UserModule {}
