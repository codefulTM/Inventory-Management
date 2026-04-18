import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ReportsService } from './reports.service';

/**
 * ReportsController — gRPC handler for MetricsReportsService.
 * Each method maps to one RPC defined in proto/metrics.proto.
 */
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @GrpcMethod('MetricsReportsService', 'GetInventoryStatus')
  async getInventoryStatus(_data: Record<string, never>) {
    const report = await this.reportsService.getInventoryStatusReport();
    return {
      generated_at: report.generated_at.toISOString(),
      total_lots: report.total_lots,
      items: report.items.map((item) => ({
        material_id: item.material_id,
        lot_id: item.lot_id,
        quantity: item.quantity,
        status: item.status,
        expiration_date: item.expiration_date ? item.expiration_date.toISOString() : '',
      })),
    };
  }

  @GrpcMethod('MetricsReportsService', 'GetMaterialUsage')
  async getMaterialUsage(data: { from?: string; to?: string }) {
    const report = await this.reportsService.getMaterialUsageReport(data.from, data.to);
    return {
      generated_at: report.generated_at.toISOString(),
      from: report.from ? report.from.toISOString() : '',
      to: report.to ? report.to.toISOString() : '',
      items: report.items.map((item) => ({
        material_id: item.material_id,
        transaction_count: item.transaction_count,
        total_quantity: item.total_quantity,
      })),
    };
  }

  @GrpcMethod('MetricsReportsService', 'GetQcPerformance')
  async getQcPerformance(_data: Record<string, never>) {
    const report = await this.reportsService.getQcPerformanceReport();
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

  @GrpcMethod('MetricsReportsService', 'GetAuditReport')
  async getAuditReport(data: { page?: number; size?: number }) {
    const report = await this.reportsService.getAuditReport(data.page, data.size);
    return {
      generated_at: report.generated_at.toISOString(),
      entries: report.entries.map((entry) => ({
        action: entry.action,
        entity: entry.entity,
        performed_by: entry.performed_by,
        performed_at: entry.performed_at.toISOString(),
        details: entry.details ? JSON.stringify(entry.details) : '',
      })),
    };
  }
}
