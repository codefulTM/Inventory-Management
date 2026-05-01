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

  private normalizeInterval(interval?: string): TrendInterval {
    if (interval === "week" || interval === "month") {
      return interval;
    }
    return "day";
  }

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
