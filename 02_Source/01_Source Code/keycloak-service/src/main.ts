/**
 * File: main.ts
 * Mô tả: Điểm khởi chạy (entry point) của keycloak-service.
 * Service này đóng vai trò là cầu nối (bridge) giữa hệ thống Inventory Management System (IMS)
 * và Keycloak Identity Provider (IdP).
 *
 * Chức năng chính:
 * - Khởi tạo HTTP server (mặc định port 3002) để phục vụ các REST API endpoints
 * - Khởi tạo gRPC microservice để các service khác trong hệ thống có thể gọi nội bộ
 * - Hỗ trợ CORS cho phép frontend truy cập từ domain khác
 * - gRPC sử dụng proto file để định nghĩa contract giữa các service
 */
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // ── Khởi tạo HTTP app: Phục vụ REST API cho frontend và health check ──────
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // Tất cả routes sẽ có prefix /api
  app.enableCors(); // Cho phép Cross-Origin Resource Sharing

  // ── Khởi tạo gRPC microservice: Phục vụ inter-service communication ────────
  // Các service khác (như backend chính) sẽ gọi qua gRPC để xác thực user
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['auth'], // Tên package trong proto file
      protoPath: [join(__dirname, '../proto/auth.proto')], // Đường dẫn đến file .proto định nghĩa API
      url: `0.0.0.0:${process.env.GRPC_PORT ?? 50051}`, // gRPC server lắng nghe tất cả interface
      loader: {
        keepCase: true, // Giữ nguyên case của field names từ proto
        longs: String, // Xử lý số nguyên lớn dưới dạng string
        enums: String, // Enum values trả về dạng string
        defaults: false, // Không tự động thêm default values
        oneofs: true, // Hỗ trợ oneof fields trong proto
      },
    },
  });

  // Khởi chạy tất cả microservices (gRPC) và HTTP server
  await app.startAllMicroservices();
  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`[keycloak-service] HTTP listening on :${port}`);
  console.log(`[keycloak-service] gRPC listening on :${process.env.GRPC_PORT ?? 50051}`);
}

bootstrap();
