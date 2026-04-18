import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './repositories/reports.repository';
import type { InventoryStatusReportDto } from './dto/inventory-status-report.dto';
import type { MaterialUsageReportDto } from './dto/material-usage-report.dto';
import type { QcPerformanceReportDto } from './dto/qc-performance-report.dto';
import type { AuditReportDto } from './dto/audit-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

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
}
