/**
 * File: public.decorator.ts
 * Mô tả: Decorator đánh dấu route không yêu cầu xác thực JWT.
 *
 * Chức năng: Thiết lập metadata IS_PUBLIC_KEY = true
 * JwtAuthGuard sẽ kiểm tra metadata này và bỏ qua xác thực nếu là public route
 *
 * Cách sử dụng:
 * @Public()
 * @Post('login')
 * login() { ... } // Route này không cần JWT token
 *
 * Thường dùng cho: login, register, forgot-password, reset-password, health-check
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — đánh dấu route không cần xác thực JWT.
 * Dùng cho: login, register, health-check, ...
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
