/**
 * File: current-user.decorator.ts
 * Mô tả: Decorator @CurrentUser() dùng để lấy thông tin user đang đăng nhập
 * Chức năng: Inject đối tượng AuthenticatedUser vào parameter của controller method
 * 
 * Cách sử dụng: Thêm @CurrentUser() trước parameter trong method signature
 * 
 * Ví dụ:
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return user; // Trả về thông tin user từ JWT
 * }
 * 
 * Dữ liệu được lấy từ req.user - đã được JwtStrategy.validate() gán vào request
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
// api-gateway: AuthenticatedUser is defined in jwt.strategy.ts

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
  // _data: Tham số tùy chọn (không sử dụng trong trường hợp này)
  // ctx: ExecutionContext chứa thông tin về request hiện tại
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    // Lấy HTTP request object
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    // Trả về thông tin user đã được xác thực từ JWT
    return request.user;
  },
);
