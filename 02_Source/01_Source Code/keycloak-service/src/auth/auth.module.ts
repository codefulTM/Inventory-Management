/**
 * File: auth.module.ts
 * Mô tả: Module xác thực (Authentication & Authorization) - Module quan trọng nhất của service.
 *
 * Chức năng chính:
 * - Cung cấp JWT Strategy để xác thực Bearer token từ Keycloak
 * - Đăng ký JwtAuthGuard (global guard bảo vệ routes)
 * - Đăng ký RolesGuard (kiểm tra quyền truy cập theo role)
 * - Khai báo HTTP controller (AuthController) và gRPC controller (AuthGrpcController)
 * - Quản lý PasswordResetToken schema cho chức năng quên mật khẩu
 *
 * Lưu ý: AuthModule được import sau cùng trong AppModule để đảm bảo global guards
 * được áp dụng đúng cho tất cả routes trong toàn bộ ứng dụng.
 */
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthGrpcController } from './auth.grpc.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserModule } from '../user/user.module';
import { MailModule } from '../mail/mail.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from '../schemas/password-reset-token.schema';

/**
 * AuthModule
 * Cung cấp JWT strategy, guards, auth HTTP endpoints, và gRPC endpoints.
 */
@Module({
  imports: [
    // Passport với JWT strategy mặc định
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UserModule,    // Truy cập user repository
    MailModule,    // Gửi email quên mật khẩu
    AuditLogModule, // Ghi log đăng nhập/đăng xuất
    // Đăng ký schema cho password reset tokens
    MongooseModule.forFeature([
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
  ],
  controllers: [AuthController, AuthGrpcController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtStrategy],
})
export class AuthModule {}
