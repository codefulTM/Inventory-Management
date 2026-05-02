/**
 * File: auth.controller.ts
 * Mô tả: Controller xử lý tất cả các route /auth/*
 * Chức năng: Là lớp API Gateway cho các chức năng xác thực, chuyển tiếp request đến keycloak-service qua gRPC
 * 
 * Các endpoint:
 * - POST /auth/login - Đăng nhập (public)
 * - POST /auth/register - Đăng ký tài khoản mới (public)
 * - POST /auth/refresh - Làm mới access token (public)
 * - POST /auth/logout - Đăng xuất (yêu cầu JWT)
 * - POST /auth/forgot-password - Quên mật khẩu (public)
 * - POST /auth/reset-password - Đặt lại mật khẩu (public)
 * - GET /auth/me - Lấy thông tin user hiện tại (yêu cầu JWT)
 */
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGatewayService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

/**
 * AuthController (api-gateway)
 * Forwards /auth/* HTTP requests to keycloak-service via gRPC.
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthGatewayService) {}

  /**
   * Trích xuất thông tin ngữ cảnh (context) từ HTTP request
   * @param req - Express Request object
   * @returns Object chứa IP và User Agent - dùng cho audit log và bảo mật
   */
  private extractCtx(req: Request) {
    return {
      // Lấy IP thực của client (hỗ trợ proxy qua x-forwarded-for)
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? '',
      // Lấy thông tin User-Agent của trình duyệt/client
      user_agent: req.headers['user-agent'] ?? '',
    };
  }

  /**
   * POST /auth/login
   * Đăng nhập vào hệ thống bằng username và password
   * Gọi gRPC đến keycloak-service để xác thực
   * @param body - Chứa username và password
   * @param req - HTTP request để lấy IP và User-Agent
   * @returns Thông tin user và JWT tokens (access_token, refresh_token)
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) body: { username: string; password: string }, @Req() req: Request) {
    const ctx = this.extractCtx(req);
    const result = await this.authService.login({ ...body, ...ctx });
    return { success: true, data: result };
  }

  /**
   * POST /auth/register
   * Đăng ký tài khoản người dùng mới
   * Gọi gRPC đến keycloak-service để tạo user trong Keycloak
   * @param body - Chứa username, email, password
   * @returns Thông tin tài khoản vừa tạo
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(ValidationPipe) body: { username: string; email: string; password: string }) {
    return this.authService.register(body);
  }

  /**
   * POST /auth/refresh
   * Làm mới access token bằng refresh token
   * @param body - Chứa refresh_token
   * @returns Access token mới và refresh token mới
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refresh(body.refresh_token);
  }

  /**
   * POST /auth/logout
   * Đăng xuất khỏi hệ thống, thu hồi refresh token
   * Yêu cầu JWT token hợp lệ trong header Authorization
   * @param body - Chứa refresh_token cần thu hồi
   * @param user - Thông tin user đã được xác thực qua JWT
   * @param req - HTTP request để lấy IP và User-Agent
   * @returns Kết quả đăng xuất
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() body: { refresh_token: string },
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ctx = this.extractCtx(req);
    return this.authService.logout({
      refresh_token: body.refresh_token,
      username: user?.username,
      ...ctx,
    });
  }

  /**
   * POST /auth/forgot-password
   * Yêu cầu đặt lại mật khẩu - gửi email hướng dẫn
   * @param body - Chứa email của tài khoản cần reset mật khẩu
   * @param req - HTTP request để lấy IP và User-Agent (phục vụ audit)
   * @returns Thông báo đã gửi email (nếu email tồn tại)
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }, @Req() req: Request) {
    const ctx = this.extractCtx(req);
    return this.authService.forgotPassword({ email: body.email, ...ctx });
  }

  /**
   * POST /auth/reset-password
   * Đặt lại mật khẩu bằng token nhận được qua email
   * @param body - Chứa token xác thực và mật khẩu mới
   * @param req - HTTP request để lấy IP và User-Agent
   * @returns Kết quả đặt lại mật khẩu
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; new_password: string }, @Req() req: Request) {
    const ctx = this.extractCtx(req);
    return this.authService.resetPassword({ ...body, ...ctx });
  }

  /**
   * GET /auth/me
   * Lấy thông tin chi tiết của user đang đăng nhập
   * Yêu cầu JWT token hợp lệ trong header Authorization
   * @param user - Thông tin user đã được xác thực qua JWT (inject bằng @CurrentUser decorator)
   * @returns Thông tin chi tiết user từ Keycloak
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.keycloak_id);
  }
}
