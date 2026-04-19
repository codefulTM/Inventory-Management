import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './repositories/reports.repository';
import type { InventoryStatusReportDto } from './dto/inventory-status-report.dto';
import type { MaterialUsageReportDto } from './dto/material-usage-report.dto';
import type { QcPerformanceReportDto } from './dto/qc-performance-report.dto';
import type { AuditReportDto } from './dto/audit-report.dto';
import type {
  AuditTrendReportDto,
  InventoryTrendReportDto,
  MaterialUsageTrendReportDto,
  QcTrendReportDto,
  TrendInterval,
} from './dto/trend-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  private normalizeInterval(interval?: string): TrendInterval {
    if (interval === 'week' || interval === 'month') {
      return interval;
    }
    return 'day';
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

  async getInventoryStatusReport(): Promise<InventoryStatusReportDto> {
    const items = await this.reportsRepository.getInventoryStatus();
    return {
      generated_at: new Date(),
      total_lots: items.length,
      items,
    };
  }

  async getMaterialUsageReport(from?: string, to?: string): Promise<MaterialUsageReportDto> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const items = await this.reportsRepository.getMaterialUsage(fromDate, toDate);
    return {
      generated_at: new Date(),
      from: fromDate,
      to: toDate,
      items,
    };
  }

  async getQcPerformanceReport(): Promise<QcPerformanceReportDto> {
    const items = await this.reportsRepository.getQcPerformance();
    return {
      generated_at: new Date(),
      items,
    };
  }

  async getAuditReport(page?: number, size?: number): Promise<AuditReportDto> {
    const entries = await this.reportsRepository.getAuditTrail(page ?? 0, size ?? 20);
    return {
      generated_at: new Date(),
      entries,
    };
  }

  async getInventoryTrendReport(
    from?: string,
    to?: string,
    interval?: string,
  ): Promise<InventoryTrendReportDto> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveDateWindow(from, to, 120);
    const points = await this.reportsRepository.getInventoryTrend(
      fromDate,
      toDate,
      normalizedInterval,
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
  ): Promise<MaterialUsageTrendReportDto> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveDateWindow(from, to, 90);
    const points = await this.reportsRepository.getMaterialUsageTrend(
      fromDate,
      toDate,
      normalizedInterval,
      limit ?? 10,
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
  ): Promise<QcTrendReportDto> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveDateWindow(from, to, 90);
    const { points, supplier_rankings } = await this.reportsRepository.getQcTrend(
      fromDate,
      toDate,
      normalizedInterval,
      limit ?? 10,
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
  ): Promise<AuditTrendReportDto> {
    const normalizedInterval = this.normalizeInterval(interval);
    const { fromDate, toDate } = this.resolveDateWindow(from, to, 120);
    const points = await this.reportsRepository.getAuditTrend(
      fromDate,
      toDate,
      normalizedInterval,
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
