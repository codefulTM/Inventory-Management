// =============================================================================
// File: main.ts
// Mục đích: Entry point khởi chạy metrics-service dưới dạng gRPC microservice
// Service này tách biệt với các service khác, chỉ expose gRPC endpoint để phục vụ
// các báo cáo (reports) về inventory, QC, audit từ dữ liệu Elasticsearch
// =============================================================================

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Tạo NestJS microservice với gRPC transport
  // - package: 'metrics' khớp với tên package trong file .proto
  // - protoPath: đường dẫn đến file proto định nghĩa các RPC methods
  // - url: địa chỉ lắng nghe, mặc định port 6741
  // - loader: cấu hình giữ nguyên case (không chuyển thành camelCase),
  //   xử lý longs/enums dưới dạng String để tương thích với gRPC
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'metrics',
      protoPath: join(__dirname, '../proto/metrics.proto'),
      url: `0.0.0.0:${process.env.GRPC_PORT ?? '6741'}`,
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: false,
        oneofs: true,
      },
    },
  });

  // Khởi động gRPC server và log thông báo
  await app.listen();
  console.log(`metrics-service gRPC listening on port ${process.env.GRPC_PORT ?? '6741'}`);
}

bootstrap();
