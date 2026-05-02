/**
 * File: main.ts
 * Mô tả: Entry point (điểm khởi đầu) của API Gateway Service
 * Chức năng: Khởi tạo ứng dụng NestJS, cấu hình CORS và Global Validation Pipe
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

/**
 * Hàm bootstrap - khởi động ứng dụng API Gateway
 * - Tạo instance NestJS application từ AppModule
 * - Cấu hình Global ValidationPipe để validate dữ liệu đầu vào tự động
 * - Bật CORS cho phép frontend truy cập (mặc định localhost:5173)
 * - Lắng nghe kết nối HTTP trên cổng được cấu hình (mặc định 3000)
 */
async function bootstrap() {
  // Khởi tạo ứng dụng NestJS với module gốc là AppModule
  const app = await NestFactory.create(AppModule);

  // Cấu hình Global Validation Pipe:
  // - transform: true → tự động chuyển đổi kiểu dữ liệu theo DTO
  // - whitelist: true → loại bỏ các field không được định nghĩa trong DTO
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Cấu hình CORS (Cross-Origin Resource Sharing)
  // Cho phép frontend truy cập API từ domain khác
  // Allow frontend origin
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true, // Cho phép gửi cookie và header Authorization
  });

  // Lấy port từ biến môi trường hoặc dùng mặc định 3000
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`[api-gateway] HTTP listening on :${port}`);
}

// Khởi chạy ứng dụng
bootstrap();
