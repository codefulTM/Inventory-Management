import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — đánh dấu route không cần xác thực JWT.
 * Dùng cho: login, register, health-check, ...
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
