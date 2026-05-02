/**
 * File: jwt-auth.guard.ts
 * Mô tả: Guard xác thực JWT cho API Gateway
 * Chức năng: Bảo vệ các route bằng cách kiểm tra JWT Bearer token trong header Authorization
 * 
 * Các trường hợp bỏ qua guard (không yêu cầu JWT):
 * 1. Route được đánh dấu bằng @Public() decorator
 * 2. Các public paths: /ai-agents/health, /ai/test-connection, /health
 * 
 * Kế thừa từ AuthGuard('jwt') của Passport - sử dụng JwtStrategy để validate token
 */
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { Request } from 'express';

/** Paths that are always public — no JWT required */
const PUBLIC_PATHS = [
  '/ai-agents/health',    // Health check của AI service
  '/ai/test-connection',  // Test kết nối AI service
  '/health',              // Health check chung của API Gateway
];

/**
 * JwtAuthGuard — bảo vệ route bằng JWT Bearer token.
 * Route được đánh dấu @Public() sẽ bỏ qua guard này.
 * 
 * Được đăng ký làm Global Guard trong AppModule, 
 * vì vậy tất cả các route đều bị bảo vệ trừ khi có @Public()
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Kiểm tra xem request có được phép đi tiếp hay không
   * @param context - ExecutionContext chứa thông tin về route đang được gọi
   * @returns true nếu cho phép, ném UnauthorizedException nếu token không hợp lệ
   */
  canActivate(context: ExecutionContext) {
    // Kiểm tra xem route có được đánh dấu @Public() không
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),   // Kiểm tra decorator trên method
      context.getClass(),     // Kiểm tra decorator trên class
    ]);

    // Nếu route là public → cho phép đi tiếp mà không cần JWT
    if (isPublic) return true;

    // Bypass JWT for well-known public proxy paths
    const req = context.switchToHttp().getRequest<Request>();
    if (PUBLIC_PATHS.includes(req.path)) return true;

    // Gọi phương thức canActivate của lớp cha (AuthGuard) để validate JWT
    return super.canActivate(context);
  }

  /**
   * Xử lý kết quả xác thực từ JwtStrategy
   * @param err - Lỗi nếu có trong quá trình xác thực
   * @param user - Thông tin user đã được giải mã từ JWT (trả về từ JwtStrategy.validate())
   * @returns Thông tin user nếu hợp lệ
   * @throws UnauthorizedException nếu token không hợp lệ hoặc đã hết hạn
   */
  handleRequest<TUser>(err: Error, user: TUser): TUser {
    if (err || !user) {
      throw (
        err ?? new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn')
      );
    }
    return user;
  }
}
