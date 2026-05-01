import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { ReportsService } from "./reports.service";

/**
 * ReportsController — gRPC handler for MetricsReportsService.
 * Each method maps to one RPC defined in proto/metrics.proto.
 */
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

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
        details: entry.details ? JSON.stringify(entry.details) : "",
      })),
    };
  }

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
