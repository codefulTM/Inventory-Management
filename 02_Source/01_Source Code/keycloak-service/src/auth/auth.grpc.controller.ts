/**
 * File: auth.grpc.controller.ts
 * Mô tả: gRPC Controller cung cấp các phương thức xác thực cho inter-service communication.
 *
 * Chức năng: Các microservices khác trong hệ thống (như backend chính) có thể gọi
 * các phương thức này qua gRPC để thực hiện:
 * - Login: Đăng nhập user
 * - Register: Đăng ký user mới
 * - Refresh: Làm mới token
 * - Logout: Đăng xuất
 * - ForgotPassword: Yêu cầu đặt lại mật khẩu
 * - ResetPassword: Đặt lại mật khẩu
 * - GetMe: Lấy thông tin user từ keycloak_id
 *
 * Service name phải khớp với định nghĩa trong auth.proto (`AuthService`)
 */
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';

/**
 * AuthGrpcController — exposes AuthService methods via gRPC.
 * Service name matches auth.proto `AuthService`.
 */
@Controller()
export class AuthGrpcController {
  constructor(private readonly authService: AuthService) {}

  /**
   * gRPC Login - Xác thực user và trả về tokens
   * Được gọi bởi backend-service khi cần xác thực user nội bộ
   */
  @GrpcMethod('AuthService', 'Login')
  async login(data: {
    username: string;
    password: string;
    ip?: string;
    user_agent?: string;
  }) {
    const ctx = { ip: data.ip ?? '', userAgent: data.user_agent ?? '' };
    return this.authService.login(
      { username: data.username, password: data.password },
      ctx,
    );
  }

  /**
   * gRPC Register - Tự đăng ký tài khoản mới (chỉ Operator)
   */
  @GrpcMethod('AuthService', 'Register')
  async register(data: { username: string; email: string; password: string }) {
    return this.authService.register({
      username: data.username,
      email: data.email,
      password: data.password,
    });
  }

  /**
   * gRPC Refresh - Làm mới access_token bằng refresh_token
   */
  @GrpcMethod('AuthService', 'Refresh')
  async refresh(data: { refresh_token: string }) {
    return this.authService.refreshToken(data.refresh_token);
  }

  /**
   * gRPC Logout - Đăng xuất và thu hồi refresh_token
   */
  @GrpcMethod('AuthService', 'Logout')
  async logout(data: {
    refresh_token: string;
    username?: string;
    ip?: string;
    user_agent?: string;
  }) {
    const ctx = { ip: data.ip ?? '', userAgent: data.user_agent ?? '' };
    return this.authService.logout(data.refresh_token, data.username, undefined, ctx);
  }

  /**
   * gRPC ForgotPassword - Gửi email đặt lại mật khẩu
   */
  @GrpcMethod('AuthService', 'ForgotPassword')
  async forgotPassword(data: { email: string; ip?: string; user_agent?: string }) {
    const ctx = { ip: data.ip ?? '', userAgent: data.user_agent ?? '' };
    return this.authService.forgotPassword(data.email, ctx);
  }

  /**
   * gRPC ResetPassword - Đặt lại mật khẩu bằng token
   */
  @GrpcMethod('AuthService', 'ResetPassword')
  async resetPassword(data: {
    token: string;
    new_password: string;
    ip?: string;
    user_agent?: string;
  }) {
    const ctx = { ip: data.ip ?? '', userAgent: data.user_agent ?? '' };
    return this.authService.resetPassword(data.token, data.new_password, ctx);
  }

  /**
   * gRPC GetMe - Lấy thông tin user từ keycloak_id
   */
  @GrpcMethod('AuthService', 'GetMe')
  async getMe(data: { keycloak_id: string }) {
    return this.authService.getMe(data.keycloak_id);
  }
}
