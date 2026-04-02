import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  generateTempPassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '@#$!';
    const all = upper + lower + digits + special;
    const rand = (str: string) => str[Math.floor(Math.random() * str.length)];
    const base = Array.from({ length: 6 }, () => rand(all)).join('');
    return rand(upper) + rand(digits) + rand(special) + base;
  }

  async sendResetPasswordEmail(to: string, username: string, resetLink: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"PharmaWMS System" <${process.env.MAIL_USER}>`,
        to,
        subject: '[PharmaWMS] Đặt lại mật khẩu',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">PharmaWMS</h1>
              <p style="color: #bfdbfe; margin: 8px 0 0;">Warehouse Management System</p>
            </div>
            <div style="padding: 32px; background: #f8fafc; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b;">Yêu cầu đặt lại mật khẩu</h2>
              <p style="color: #475569;">Xin chào <strong>${username}</strong>, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
              <a href="${resetLink}" style="display: inline-block; margin: 16px 0; padding: 12px 28px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Đặt lại mật khẩu</a>
              <p style="color: #64748b; font-size: 13px;">Link có hiệu lực trong <strong>15 phút</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
            </div>
            <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
              © 2026 PharmaWMS — IT Department
            </div>
          </div>
        `,
      });
      this.logger.log(`Reset password email sent to: ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${to}: ${err.message}`);
    }
  }

  async sendNewAccountEmail(to: string, username: string, role: string, tempPassword: string): Promise<void> {
    const loginUrl = 'https://inventory-system.cloud';

    try {
      await this.transporter.sendMail({
        from: `"PharmaWMS System" <${process.env.MAIL_USER}>`,
        to,
        subject: '[PharmaWMS] Tài khoản của bạn đã được tạo',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">PharmaWMS</h1>
              <p style="color: #bfdbfe; margin: 8px 0 0;">Warehouse Management System</p>
            </div>
            <div style="padding: 32px; background: #f8fafc; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e293b;">Tài khoản của bạn đã được tạo</h2>
              <p style="color: #475569;">Xin chào, tài khoản hệ thống PharmaWMS của bạn đã được cấp phát với thông tin sau:</p>
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; width: 140px;">Tên đăng nhập:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${username}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Mật khẩu tạm thời:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #dc2626; font-size: 18px; letter-spacing: 2px;">${tempPassword}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Vai trò:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">${role}</td>
                  </tr>
                </table>
              </div>
              <a href="${loginUrl}/login" style="display: inline-block; margin: 8px 0 16px; padding: 12px 28px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Đăng nhập ngay</a>
              <p style="color: #dc2626; font-size: 13px;">⚠️ Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu.</p>
            </div>
            <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
              © 2026 PharmaWMS — IT Department
            </div>
          </div>
        `,
      });
      this.logger.log(`Account email sent to: ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }
}
