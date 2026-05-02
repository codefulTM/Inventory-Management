/**
 * Điểm khởi chạy chính (Entry point) của Inventory Management Microservice
 * 
 * File này chịu trách nhiệm:
 * - Khởi tạo ứng dụng NestJS với cấu hình Express
 * - Thiết lập CORS cho phép Frontend truy cập
 * - Cấu hình Global Validation Pipe để validate dữ liệu đầu vào
 * - Khởi chạy HTTP Server cho REST API (port 3001 mặc định)
 * - Khởi chạy gRPC Microservice để giao tiếp với API Gateway (port 50052 mặc định)
 * - Cấu hình phục vụ file tĩnh (uploads) cho việc download attachment
 * 
 * Hệ thống chạy theo mô hình Hybrid: vừa phục vụ HTTP REST, vừa phục vụ gRPC
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

/**
 * Hàm khởi tạo ứng dụng
 * Thực hiện các bước: tạo app, cấu hình CORS, validation, static files, và khởi chạy các service
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Lấy cấu hình từ ConfigService (đọc từ file .env)
  const config = app.get(ConfigService);
  // Port cho HTTP REST API, mặc định là 3001
  const port = config.get<string>('PORT') ?? '3001';
  // Danh sách origin được phép truy cập CORS (hỗ trợ nhiều origin cách nhau bởi dấu phẩy)
  const frontendOrigin =
    config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173';

  // Enable trust proxy để lấy IP thực từ X-Forwarded-For header
  // Cần thiết khi chạy sau reverse proxy (nginx, load balancer)
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  // Cấu hình CORS (Cross-Origin Resource Sharing)
  // Cho phép Frontend (chạy trên domain khác) có thể gọi API
  app.enableCors({
    origin: frontendOrigin.split(',').map((url) => url.trim()), // support multiple origins separated by comma
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-User-Role',
      'X-User-Id',
    ],
    credentials: true, // cho phép cookie và header xác thực
    preflightContinue: false, // truyền phản hồi preflight cho bộ xử lý tiếp theo
    optionsSuccessStatus: 204,
  });

  // Bật ValidationPipe toàn cục để tự động validate dữ liệu đầu vào
  // - whitelist: true → Loại bỏ các thuộc tính không được khai báo trong DTO
  // - transform: true → Tự động chuyển đổi payload thành instance của class DTO
  // - forbidNonWhitelisted: true → Trả về lỗi nếu có thuộc tính lạ trong request
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Cấu hình phục vụ file tĩnh cho thư mục uploads
  // Cho phép truy cập các file đã upload thông qua URL /uploads/filename
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // ── Khởi tạo gRPC Microservice ──────────────────────────────────────────
  // gRPC được sử dụng để API Gateway gọi nội bộ đến service này
  // - package: 'inventory' → Tên package trong file .proto
  // - protoPath: Đường dẫn đến file định nghĩa protobuf
  // - url: Địa chỉ lắng nghe gRPC (mặc định port 50052)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'inventory',
      protoPath: join(__dirname, '../proto/inventory.proto'),
      url: `0.0.0.0:${config.get<string>('GRPC_PORT', '50052')}`,
    },
  });

  // Khởi chạy tất cả microservices (bao gồm cả gRPC)
  await app.startAllMicroservices();
  // Khởi chạy HTTP server
  await app.listen(parseInt(port, 10));

  // In thông tin khởi chạy ra console để dễ debug
  console.log(`Backend is running on: ${await app.getUrl()}`);
  console.log(`Backend gRPC on port: ${config.get('GRPC_PORT', '50052')}`);
  console.log(`CORS origin: ${frontendOrigin}`);
}
bootstrap();
