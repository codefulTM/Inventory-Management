// Module quản lý các endpoint AI thông thường (không phải AI Agents)
// Bao gồm: Controller xử lý HTTP request và Service gọi HuggingFace API
import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiSupplierService } from './ai-supplier.service';
import { BackendClientModule } from '../backend-client/backend-client.module';

@Module({
  imports: [
    // Import BackendClientModule để sử dụng BackendDataService gọi gRPC sang backend
    BackendClientModule,
  ],
  controllers: [AiController], // Đăng ký controller xử lý route /ai/*
  providers: [AiSupplierService], // Đăng ký service gọi HuggingFace API
})
export class AiModule {}
