/**
 * File: mail.module.ts
 * Mô tả: Module quản lý việc gửi email trong hệ thống.
 *
 * Chức năng:
 * - Cung cấp MailService để các module khác có thể gửi email
 * - Hiện tại hỗ trợ: gửi email đặt lại mật khẩu, email tạo tài khoản mới
 * - Sử dụng Gmail SMTP thông qua nodemailer
 *
 * Export: MailService để có thể inject vào AuthService, UserService
 */
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService], // Export để các module khác có thể sử dụng
})
export class MailModule {}
