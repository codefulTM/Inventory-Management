// =============================================================================
// File: reports/reports.controller.ts
// Mục đích: gRPC Controller xử lý các requests từ client gọi đến MetricsReportsService
// 
// Mỗi method được đánh dấu @GrpcMethod sẽ map với một RPC definition trong file 
// proto/metrics.proto. Controller này chịu trách nhiệm:
// - Nhận dữ liệu từ gRPC request
// - Gọi ReportsService tương ứng
// - Chuyển đổi DTO objects sang định dạng gRPC response (thường là ISO string dates)
// =============================================================================

import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { ReportsService } from "./reports.service";

/**
 * ReportsController — gRPC handler for MetricsReportsService.
 * Mỗi method map với một RPC được định nghĩa trong proto/metrics.proto.
 */
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ---------------------------------------------------------------------------
  // RPC: GetInventoryStatus
  // Mục đích: Lấy báo cáo trạng thái inventory (theo status: Accepted, Quarantine...)
  // Params: from, to (date range), interval (day/week/month), warehouse_id
  // ---------------------------------------------------------------------------
  @GrpcMethod("MetricsReportsService", "GetInventoryStatus")
  async getInventoryStatus(data: {
    from?: string;
    to?: string;
    interval?: string;
    warehouse_id?: string;
  }) {
    const report = await this.reportsService.getInventoryStatusReport(
      data.from,
      data.to,
      data.interval,
      data.warehouse_id,
    );
    // Chuyển đổi Date objects sang ISO string để gRPC serialize đúng
    return {
      generated_at: report.generated_at.toISOString(),
      total_lots: report.total_lots,
      items: report.items.map((item) => ({
        material_id: item.material_id,
        lot_id: item.lot_id,
        quantity: item.quantity,
        status: item.status,
        expiration_date: item.expiration_date
          ? item.expiration_date.toISOString()
          : "",
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // RPC: GetMaterialUsage
  // Mục đích: Lấy báo cáo sử dụng nguyên liệu (tổng quantity, số lần giao dịch)
  // Params: from, to (date range), warehouse_id
  // ---------------------------------------------------------------------------
  @GrpcMethod("MetricsReportsService", "GetMaterialUsage")
  async getMaterialUsage(data: {
    from?: string;
    to?: string;
    warehouse_id?: string;
  }) {
    const report = await this.reportsService.getMaterialUsageReport(
      data.from,
      data.to,
      data.warehouse_id,
    );
    return {
      generated_at: report.generated_at.toISOString(),
      from: report.from ? report.from.toISOString() : "",
      to: report.to ? report.to.toISOString() : "",
      items: report.items.map((item) => ({
        material_id: item.material_id,
        transaction_count: item.transaction_count,
        total_quantity: item.total_quantity,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // RPC: GetQcPerformance
  // Mục đích: Lấy báo cáo hiệu suất QC theo nhà cung cấp (approved/rejected ratio)
  // Params: from, to (date range), warehouse_id
  // ---------------------------------------------------------------------------
  @GrpcMethod("MetricsReportsService", "GetQcPerformance")
  async getQcPerformance(data: {
    from?: string;
    to?: string;
    warehouse_id?: string;
  }) {
    const report = await this.reportsService.getQcPerformanceReport(
      data.from,
      data.to,
      data.warehouse_id,
    );
    return {
      generated_at: report.generated_at.toISOString(),
      items: report.items.map((item) => ({
        supplier_name: item.supplier_name,
        approved: item.approved,
        rejected: item.rejected,
        quality_rate: item.quality_rate,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // RPC: GetAuditReport
  // Mục đích: Lấy báo cáo audit trail (lịch sử thay đổi) có phân trang
  // Params: from, to (date range), page, size (pagination), warehouse_id
  // ---------------------------------------------------------------------------
  @GrpcMethod("MetricsReportsService", "GetAuditReport")
  async getAuditReport(data: {
    from?: string;
    to?: string;
    page?: number;
    size?: number;
    warehouse_id?: string;
  }) {
    const report = await this.reportsService.getAuditReport(
      data.page,
      data.size,
      data.from,
      data.to,
      data.warehouse_id,
    );
    return {
      generated_at: report.generated_at.toISOString(),
      entries: report.entries.map((entry) => ({
        action: entry.action,
        entity: entry.entity,
        performed_by: entry.performed_by,
        performed_at: entry.performed_at.toISOString(),
        // details là object, cần stringify để gRPC truyền tải
        details: entry.details ? JSON.stringify(entry.details) : "",
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // RPC: GetInventoryTrend
  // Mục đích: Lấy dữ liệu xu hướng inventory theo thời gian (time-series)
  // Params: from, to (date range), interval (day/week/month), warehouse_id
  // ---------------------------------------------------------------------------
  @GrpcMethod("MetricsReportsService", "GetInventoryTrend")
  async getInventoryTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
    warehouse_id?: string;
  }) {
    const report = await this.reportsService.getInventoryTrendReport(
      data.from,
      data.to,
      data.interval,
      data.warehouse_id,
    );

    return {
      generated_at: report.generated_at.toISOString(),
      from: report.from.toISOString(),
      to: report.to.toISOString(),
      interval: report.interval,
      points: report.points,
    };
  }

  // ---------------------------------------------------------------------------
  // RPC: GetMaterialUsageTrend
  // Mục đích: Lấy xu hướng sử dụng nguyên liệu theo thời gian, top N materials
  // Params: from, to, interval, limit (số lượng material), warehouse_id
  // ---------------------------------------------------------------------------
  @GrpcMethod("MetricsReportsService", "GetMaterialUsageTrend")
  async getMaterialUsageTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
    warehouse_id?: string;
  }) {
    const report = await this.reportsService.getMaterialUsageTrendReport(
      data.from,
      data.to,
      data.interval,
      data.limit,
      data.warehouse_id,
    );

    return {
      generated_at: report.generated_at.toISOString(),
      from: report.from.toISOString(),
      to: report.to.toISOString(),
      interval: report.interval,
      points: report.points,
    };
  }

  // ---------------------------------------------------------------------------
  // RPC: GetQcTrend
  // Mục đích: Lấy xu hướng QC theo thời gian + xếp hạng nhà cung cấp
  // Params: from, to, interval, limit (top N suppliers), warehouse_id
  // ---------------------------------------------------------------------------
  @GrpcMethod("MetricsReportsService", "GetQcTrend")
  async getQcTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
    warehouse_id?: string;
  }) {
    const report = await this.reportsService.getQcTrendReport(
      data.from,
      data.to,
      data.interval,
      data.limit,
      data.warehouse_id,
    );

    return {
      generated_at: report.generated_at.toISOString(),
      from: report.from.toISOString(),
      to: report.to.toISOString(),
      interval: report.interval,
      points: report.points,
      supplier_rankings: report.supplier_rankings,
    };
  }

  // ---------------------------------------------------------------------------
  // RPC: GetAuditTrend
  // Mục đích: Lấy xu hướng hoạt động audit theo thời gian
  // Params: from, to, interval, warehouse_id
  // ---------------------------------------------------------------------------
  @GrpcMethod("MetricsReportsService", "GetAuditTrend")
  async getAuditTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
    warehouse_id?: string;
  }) {
    const report = await this.reportsService.getAuditTrendReport(
      data.from,
      data.to,
      data.interval,
      data.warehouse_id,
    );

    return {
      generated_at: report.generated_at.toISOString(),
      from: report.from.toISOString(),
      to: report.to.toISOString(),
      interval: report.interval,
      points: report.points,
    };
  }
}
