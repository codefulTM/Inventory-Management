/**
 * MailModule - Module cung cấp dịch vụ gửi email
 * Export MailService để các module khác (Auth, User) có thể sử dụng
 */
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
