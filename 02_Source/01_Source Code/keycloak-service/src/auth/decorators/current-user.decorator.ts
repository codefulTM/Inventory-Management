/**
 * File: current-user.decorator.ts
 * Mô tả: Custom decorator để lấy thông tin user đã xác thực từ request.
 *
 * Chức năng: Trích xuất object AuthenticatedUser từ request.user
 * (được gắn bởi JwtStrategy.validate())
 *
 * Cách sử dụng:
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return user; // Trả về thông tin user đang đăng nhập
 * }
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * @CurrentUser() — inject authenticated user vào parameter của handler.
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
