/**
 * File: grpc.module.ts
 * Mô tả: Module quản lý kết nối gRPC đến các service khác
 * Chức năng: Đăng ký 2 gRPC client:
 *   1. AUTH_GRPC_CLIENT    → keycloak-service (port 50051) — xác thực, quản lý user
 *   2. METRICS_GRPC_CLIENT → metrics-service (port 6741)  — báo cáo, metrics
 * 
 * Module được đánh dấu @Global() nên có thể inject vào bất kỳ module nào
 * 
 * resolveProtoPath(): Tìm file .proto trong nhiều vị trí khác nhau
 * để hỗ trợ cả môi trường development và Docker deployment
 */
import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { join } from 'path';

// Token dùng để inject gRPC client vào các service
export const AUTH_SERVICE_TOKEN = 'AUTH_GRPC_CLIENT';     // Client đến keycloak-service
export const METRICS_SERVICE_TOKEN = 'METRICS_GRPC_CLIENT'; // Client đến metrics-service

/**
 * Tìm đường dẫn tuyệt đối đến file .proto
 * Thử nhiều vị trí khác nhau để tương thích với cả build output và source code
 * 
 * @param protoFileName - Tên file proto (vd: 'auth.proto', 'metrics.proto')
 * @returns Đường dẫn tuyệt đối đến file proto
 */
function resolveProtoPath(protoFileName: string): string {
  const candidates = [
    join(__dirname, `../../proto/${protoFileName}`),     // Từ dist/ tìm lên 2 cấp
    join(__dirname, `../../../proto/${protoFileName}`),  // Từ dist/ tìm lên 3 cấp
    join(process.cwd(), `proto/${protoFileName}`),       // Từ thư mục hiện tại
    join(process.cwd(), `../proto/${protoFileName}`),    // Từ thư mục cha
  ];

  // Trả về đường dẫn đầu tiên tồn tại, nếu không thì dùng candidate đầu tiên
  const existing = candidates.find((path) => existsSync(path));
  return existing ?? candidates[0];
}

/**
 * GrpcModule — đăng ký gRPC client cho các downstream service
 * @Global() để có thể sử dụng ở mọi module mà không cần import
 * 
 * AUTH_GRPC_CLIENT    → keycloak-service (:50051) — xử lý đăng nhập, đăng ký, quản lý user
 * METRICS_GRPC_CLIENT → metrics-service  (:6741)  — xử lý báo cáo, metrics
 */
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        // Đăng ký gRPC client đến keycloak-service
        name: AUTH_SERVICE_TOKEN,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',  // gRPC package name trong auth.proto
            protoPath: resolveProtoPath('auth.proto'),  // Đường dẫn đến file proto
            url: config.get<string>('KEYCLOAK_SERVICE_GRPC_URL', 'localhost:50051'),
            loader: {
              keepCase: true,    // Giữ nguyên case của field names
              longs: String,     // Chuyển số lớn thành string (tránh mất precision)
              enums: String,     // Enum values dưới dạng string
              defaults: false,   // Không dùng default values
              oneofs: true,      // Bật hỗ trợ oneof
            },
          },
        }),
      },
      {
        // Đăng ký gRPC client đến metrics-service
        name: METRICS_SERVICE_TOKEN,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'metrics',  // gRPC package name trong metrics.proto
            protoPath: resolveProtoPath('metrics.proto'),
            url: config.get<string>('METRICS_SERVICE_GRPC_URL', 'localhost:6741'),
            loader: {
              keepCase: true,
              longs: String,
              enums: String,
              defaults: false,
              oneofs: true,
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],  // Export để module khác có thể sử dụng
})
export class GrpcModule {}
