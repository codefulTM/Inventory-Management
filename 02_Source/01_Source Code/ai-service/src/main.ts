// Điểm khởi đầu của AI Service trong hệ thống Inventory Management System (IMS)
// AI Service chạy độc lập trên port 3003, cung cấp 2 nhánh chính:
// 1. AI endpoints thông thường: Phân tích nhà cung cấp qua HuggingFace API
// 2. AI Agents: Hệ thống multi-agent sử dụng Google Gemini cho các nghiệp vụ kho
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Khởi tạo ứng dụng NestJS với module gốc AppModule
  const app = await NestFactory.create(AppModule);

  // Lấy ConfigService để đọc biến môi trường
  const config = app.get(ConfigService);
  // Port mặc định là 3003 nếu không được cấu hình trong biến môi trường PORT
  const port = config.get<string>('PORT') ?? '3003';

  // Bật CORS cho phép tất cả origin (cấu hình cho môi trường development)
  app.enableCors({ origin: '*' });

  // Cấu hình Global Validation Pipe để tự động validate dữ liệu đầu vào
  // whitelist: true - Loại bỏ các trường không được khai báo trong DTO
  // transform: true - Tự động chuyển đổi kiểu dữ liệu
  // forbidNonWhitelisted: false - Cho phép các trường thừa (lenient mode cho AI endpoints)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false, // lenient for AI endpoints
    }),
  );

  // Khởi động server và lắng nghe trên port đã cấu hình
  await app.listen(parseInt(port, 10));
  console.log(`AI Service is running on port ${port}`);
}
bootstrap();
