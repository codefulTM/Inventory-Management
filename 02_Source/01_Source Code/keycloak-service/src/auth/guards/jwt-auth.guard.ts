/**
 * File: jwt-auth.guard.ts
 * Mô tả: Guard bảo vệ các routes yêu cầu xác thực bằng JWT Bearer token.
 *
 * Chức năng:
 * - Kiểm tra xem route có được đánh dấu @Public() hay không
 * - Nếu là public route → cho phép truy cập không cần token
 * - Nếu không phải public → gọi Passport JWT strategy để xác thực token
 * - Xử lý lỗi khi token không hợp lệ hoặc hết hạn
 *
 * Sử dụng: Được đăng ký là global guard trong AppModule
 * (thông qua AuthModule exports JwtAuthGuard)
 */
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JwtAuthGuard — bảo vệ route bằng JWT Bearer token.
 * Route được đánh dấu @Public() sẽ bỏ qua guard này.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Kiểm tra xem route có được đánh dấu @Public() không
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error, user: TUser): TUser {
    if (err || !user) {
      throw (
        err ?? new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn')
      );
    }
    return user;
  }
}
