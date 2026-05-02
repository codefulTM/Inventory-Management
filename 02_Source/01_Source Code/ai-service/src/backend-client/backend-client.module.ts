// Module cấu hình gRPC client để gọi sang inventory-management-service (backend)
// Sử dụng NestJS Microservices với gRPC transport
// Kết nối tới backend qua URL được cấu hình trong biến môi trường BACKEND_GRPC_URL
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { BackendDataService } from './backend-data.service';

@Module({
  imports: [
    // Đăng ký gRPC client bất đồng bộ (async) để đọc config từ ConfigService
    ClientsModule.registerAsync([
      {
        // Tên token để inject ClientGrpc trong service
        name: 'BACKEND_AI_DATA',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC, // Sử dụng gRPC làm transport layer
          options: {
            package: 'inventory', // Tên package trong proto file
            protoPath: join(__dirname, '../../proto/inventory.proto'), // Đường dẫn đến file .proto
            url: config.get<string>('BACKEND_GRPC_URL', 'localhost:50052'), // URL backend (mặc định localhost:50052)
            loader: {
              // Cấu hình protobuf loader
              keepCase: true, // Giữ nguyên case của field names
              longs: String, // Xử lý số nguyên lớn dưới dạng string
              enums: String, // Enum dưới dạng string
              defaults: false, // Không thêm default values
              oneofs: true, // Hỗ trợ oneof fields
            },
          },
        }),
      },
    ]),
  ],
  providers: [BackendDataService], // Đăng ký service gọi backend
  exports: [BackendDataService], // Export để các module khác có thể sử dụng
})
export class BackendClientModule {}
