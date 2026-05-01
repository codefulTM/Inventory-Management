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

  @GrpcMethod('AuthService', 'Register')
  async register(data: { username: string; email: string; password: string }) {
    return this.authService.register({
      username: data.username,
      email: data.email,
      password: data.password,
    });
  }

  @GrpcMethod('AuthService', 'Refresh')
  async refresh(data: { refresh_token: string }) {
    return this.authService.refreshToken(data.refresh_token);
  }

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

  @GrpcMethod('AuthService', 'ForgotPassword')
  async forgotPassword(data: { email: string; ip?: string; user_agent?: string }) {
    const ctx = { ip: data.ip ?? '', userAgent: data.user_agent ?? '' };
    return this.authService.forgotPassword(data.email, ctx);
  }

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

  @GrpcMethod('AuthService', 'GetMe')
  async getMe(data: { keycloak_id: string }) {
    return this.authService.getMe(data.keycloak_id);
  }
}
