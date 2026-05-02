/**
 * File: main.ts
 * Mục đích: Điểm khởi chạy chính của analytics-indexer-service
 * Service này là một worker nền (background worker) không mở HTTP port
 * Sử dụng ApplicationContext của NestJS thay vì HTTP server thông thường
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // Khởi tạo ứng dụng NestJS ở chế độ ApplicationContext (không có HTTP server)
  // Đây là một background worker chuyên dụng để chạy các tác vụ đồng bộ dữ liệu
  const app = await NestFactory.createApplicationContext(AppModule);
  
  // Kích hoạt shutdown hooks để xử lý graceful shutdown khi nhận tín hiệu dừng từ hệ thống
  app.enableShutdownHooks();

  const logger = new Logger('Bootstrap');
  logger.log('analytics-indexer-service đã khởi động (chế độ ApplicationContext - không có HTTP)');
}

// Xử lý lỗi nghiêm trọng trong quá trình khởi chạy
bootstrap().catch((err) => {
  console.error('Lỗi nghiêm trọng trong quá trình khởi chạy bootstrap', err);
  process.exit(1);
});
