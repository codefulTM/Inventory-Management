/**
 * File: redis/redis.constants.ts
 * Mục đích: Định nghĩa các hằng số (constants) cho Redis module
 * 
 * REDIS_CLIENT: Token để inject Redis client thông qua NestJS DI container
 * Sử dụng để phân biệt provider khi có nhiều kết nối Redis khác nhau
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';
