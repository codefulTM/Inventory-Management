// =============================================================================
// File: reports/reports.service.ts
// Mục đích: Service chứa business logic cho tất cả các loại báo cáo
// 
// Vai trò:
// - Đóng vai trò trung gian giữa Controller và Repository
// - Xử lý tham số đầu vào (parse dates, normalize intervals)
// - Gọi Repository để lấy dữ liệu thô từ Elasticsearch
// - Tổng hợp dữ liệu thành các DTO response
// 
// Các loại báo cáo được hỗ trợ:
// 1. Inventory Status - Trạng thái tồn kho theo status
// 2. Material Usage - Sử dụng nguyên liệu
// 3. QC Performance - Hiệu suất kiểm tra chất lượng
// 4. Audit Report - Lịch sử thay đổi (có phân trang)
// 5. Trend Reports - Báo cáo xu hướng theo thời gian (inventory, usage, qc, audit)
// =============================================================================

import { Injectable } from "@nestjs/common";
import { ReportsRepository } from "./repositories/reports.repository";
import type { InventoryStatusReportDto } from "./dto/inventory-status-report.dto";
import type { MaterialUsageReportDto } from "./dto/material-usage-report.dto";
import type { QcPerformanceReportDto } from "./dto/qc-performance-report.dto";
import type { AuditReportDto } from "./dto/audit-report.dto";
import type {
  AuditTrendReportDto,
  InventoryTrendReportDto,
  MaterialUsageTrendReportDto,
  QcTrendReportDto,
  TrendInterval,
} from "./dto/trend-report.dto";

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  // ---------------------------------------------------------------------------
  // Chuẩn hóa interval: chỉ chấp nhận 'day', 'week', 'month'
  // Mặc định là 'day' nếu giá trị không hợp lệ
  // ---------------------------------------------------------------------------
  private normalizeInterval(interval?: string): TrendInterval {
    if (interval === "week" || interval === "month") {
      return interval;
    }
    return "day";
  }

  // ---------------------------------------------------------------------------
  // Giải quyết cửa sổ thời gian (date window) cho các truy vấn
  // - Nếu from và to đều có: sử dụng nguyên bản
  // - Nếu chỉ có to: from = to - fallbackDays
  // - Nếu không có gì: to = now, from = now - fallbackDays
  // ---------------------------------------------------------------------------
  private resolveDateWindow(from?: string, to?: string, fallbackDays = 90) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - fallbackDays * 24 * 60 * 60 * 1000);

    return {
      fromDate,
      toDate,
    };
  }

  // ---------------------------------------------------------------------------
  // Báo cáo trạng thái inventory
  // Truy vấn Elasticsearch để lấy tất cả lots, nhóm theo status
  // ---------------------------------------------------------------------------
  async getInventoryStatusReport(
    from?: string,
    to?: string,
    interval?: string,
    warehouseId?: string,
  ): Promise<InventoryStatusReportDto> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const items = await this.reportsRepository.getInventoryStatus(
      fromDate,
      toDate,
      warehouseId,
    );
    return {
      generated_at: new Date(),
      total_lots: items.length,
      items,
    };
  }

  // ---------------------------------------------------------------------------
  // Báo cáo sử dụng nguyên liệu
  // Thống kê số lượng giao dịch và tổng quantity theo từng material
  // ---------------------------------------------------------------------------
  async getMaterialUsageReport(
    from?: string,
    to?: string,
    warehouseId?: string,
  ): Promise<MaterialUsageReportDto> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const items = await this.reportsRepository.getMaterialUsage(
      fromDate,
      toDate,
      warehouseId,
    );
    return {
      generated_at: new Date(),
      from: fromDate,
      to: toDate,
      items,
    };
  }

  // ---------------------------------------------------------------------------
  // Báo cáo hiệu suất QC
  // Tính tỷ lệ chất lượng (quality_rate) theo từng nhà cung cấp
  // ---------------------------------------------------------------------------
  async getQcPerformanceReport(
    from?: string,
    to?: string,
    warehouseId?: string,
  ): Promise<QcPerformanceReportDto> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const items = await this.reportsRepository.getQcPerformance(
      fromDate,
      toDate,
      warehouseId,
    );
    return {
      generated_at: new Date(),
      items,
    };
  }

  // ---------------------------------------------------------------------------
  // Báo cáo audit trail (lịch sử thay đổi)
  // Hỗ trợ phân trang với page và size
  // ---------------------------------------------------------------------------
  async getAuditReport(
    page?: number,
    size?: number,
    from?: string,
    to?: string,
    warehouseId?: string,
  ): Promise<AuditReportDto> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const entries = await this.reportsRepository.getAuditTrail(
      page ?? 0,
      size ?? 20,
      fromDate,
      toDate,
      warehouseId,
    );
    return {
      generated_at: new Date(),
      entries,
    };
  }

  // ---------------------------------------------------------------------------
  // Báo cáo xu hướng inventory theo thời gian
  // fallbackDays=120: xem xu hướng 120 ngày nếu không chỉ định from/to
  // ---------------------------------------------------------------------------
  async getInventoryTrendReport(
    from?: string,
    to?: string,
    interval?: string,
    warehouseId?: string,
  ): Promise<InventoryTrendReportDto> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveDateWindow(from, to, 120);
    const points = await this.reportsRepository.getInventoryTrend(
      fromDate,
      toDate,
      normalizedInterval,
      warehouseId,
    );

    return {
      generated_at: new Date(),
      from: fromDate,
      to: toDate,
      interval: normalizedInterval,
      points,
    };
  }

  // ---------------------------------------------------------------------------
  // Báo cáo xu hướng sử dụng nguyên liệu
  // Trả về top N materials có hoạt động nhiều nhất
  // ---------------------------------------------------------------------------
  async getMaterialUsageTrendReport(
    from?: string,
    to?: string,
    interval?: string,
    limit?: number,
    warehouseId?: string,
  ): Promise<MaterialUsageTrendReportDto> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveDateWindow(from, to, 90);
    const points = await this.reportsRepository.getMaterialUsageTrend(
      fromDate,
      toDate,
      normalizedInterval,
      limit ?? 10,
      warehouseId,
    );

    return {
      generated_at: new Date(),
      from: fromDate,
      to: toDate,
      interval: normalizedInterval,
      points,
    };
  }

  // ---------------------------------------------------------------------------
  // Báo cáo xu hướng QC + xếp hạng nhà cung cấp
  // Bao gồm cả pass/fail/pending count theo thời gian và ranking theo supplier
  // ---------------------------------------------------------------------------
  async getQcTrendReport(
    from?: string,
    to?: string,
    interval?: string,
    limit?: number,
    warehouseId?: string,
  ): Promise<QcTrendReportDto> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveDateWindow(from, to, 90);
    const { points, supplier_rankings } =
      await this.reportsRepository.getQcTrend(
        fromDate,
        toDate,
        normalizedInterval,
        limit ?? 10,
        warehouseId,
      );

    return {
      generated_at: new Date(),
      from: fromDate,
      to: toDate,
      interval: normalizedInterval,
      points,
      supplier_rankings,
    };
  }

  // ---------------------------------------------------------------------------
  // Báo cáo xu hướng audit activities
  // Thống kê số lượng hoạt động và số user duy nhất theo thời gian
  // ---------------------------------------------------------------------------
  async getAuditTrendReport(
    from?: string,
    to?: string,
    interval?: string,
    warehouseId?: string,
  ): Promise<AuditTrendReportDto> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveDateWindow(from, to, 120);
    const points = await this.reportsRepository.getAuditTrend(
      fromDate,
      toDate,
      normalizedInterval,
      warehouseId,
    );

    return {
      generated_at: new Date(),
      from: fromDate,
      to: toDate,
      interval: normalizedInterval,
      points,
    };
  }
}
