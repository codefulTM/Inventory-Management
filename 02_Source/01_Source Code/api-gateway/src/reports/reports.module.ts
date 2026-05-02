/**
 * File: reports.module.ts
 * Mô tả: Module báo cáo (Reports Module)
 * Chức năng: Đóng gói ReportsController — xử lý các endpoint báo cáo
 * 
 * Luồng dữ liệu: HTTP Request → ReportsController → gRPC → metrics-service
 * ReportsController gọi gRPC đến metrics-service để lấy dữ liệu báo cáo
 */
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';

@Module({
  controllers: [ReportsController],
})
export class ReportsModule {}
