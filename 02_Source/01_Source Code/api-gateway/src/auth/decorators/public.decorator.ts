/**
 * File: public.decorator.ts
 * Mô tả: Decorator @Public() dùng để đánh dấu route không yêu cầu xác thực JWT
 * Chức năng: Bỏ qua JwtAuthGuard cho các route được đánh dấu
 * 
 * Cách sử dụng: Thêm @Public() phía trên method hoặc class controller
 * Ví dụ: @Public() @Post('login') login() {...}
 * 
 * Được sử dụng cho: login, register, forgot-password, reset-password, 
 * refresh token, và các health check endpoints
 */
import { SetMetadata } from '@nestjs/common';

// Key dùng để lưu trữ metadata trong Reflector
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — đánh dấu route không cần xác thực JWT.
 * Dùng cho: login, register, health-check, ...
 * 
 * Khi route được đánh dấu @Public(), JwtAuthGuard sẽ bỏ qua việc kiểm tra JWT
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
