// =============================================================================
// File: reports/reports.module.ts
// Mục đích: Module quản lý tất cả components liên quan đến báo cáo (reports)
// 
// Thành phần:
// - ReportsController: xử lý các gRPC requests từ client
// - ReportsService: chứa business logic, điều phối dữ liệu
// - ReportsRepository: truy vấn dữ liệu từ Elasticsearch
// =============================================================================

import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ReportsRepository } from "./repositories/reports.repository";

@Module({
  imports: [],
  // Controller expsoe các gRPC methods cho client gọi đến
  controllers: [ReportsController],
  // Service và Repository được đăng ký làm providers để inject
  providers: [ReportsService, ReportsRepository],
})
export class ReportsModule {}
