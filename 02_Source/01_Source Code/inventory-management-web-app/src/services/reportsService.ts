import { apiClient } from "./apiClient";
import type {
  AuditReport,
  AuditTrendReport,
  InventoryStatusReport,
  InventoryTrendReport,
  MaterialUsageReport,
  MaterialUsageTrendReport,
  QcPerformanceReport,
  QcTrendReport,
  TrendInterval,
} from "../types/reports";

function unwrapOrThrow<T>(
  data: T | null,
  error: { message?: string } | null,
  fallback: string,
): T {
  if (error) {
    throw new Error(error.message || fallback);
  }
  if (!data) {
    throw new Error(fallback);
  }
  return data;
}

export async function getInventoryStatusReport(
  from?: string,
  to?: string,
  warehouseId?: string,
): Promise<InventoryStatusReport> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (warehouseId) params.warehouse_id = warehouseId;

  const { data, error } = await apiClient.get<InventoryStatusReport>(
    "/reports/inventory-status",
    { params: Object.keys(params).length > 0 ? params : undefined },
  );
  return unwrapOrThrow(data, error, "Unable to load inventory status report");
}

export async function getMaterialUsageReport(
  from?: string,
  to?: string,
  warehouseId?: string,
): Promise<MaterialUsageReport> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (warehouseId) params.warehouse_id = warehouseId;

  const { data, error } = await apiClient.get<MaterialUsageReport>(
    "/reports/material-usage",
    { params: Object.keys(params).length > 0 ? params : undefined },
  );

  return unwrapOrThrow(data, error, "Unable to load material usage report");
}

export async function getQcPerformanceReport(
  from?: string,
  to?: string,
  warehouseId?: string,
): Promise<QcPerformanceReport> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (warehouseId) params.warehouse_id = warehouseId;

  const { data, error } = await apiClient.get<QcPerformanceReport>(
    "/reports/qc-performance",
    { params: Object.keys(params).length > 0 ? params : undefined },
  );
  return unwrapOrThrow(data, error, "Unable to load QC performance report");
}

export async function getAuditReport(
  from?: string,
  to?: string,
  warehouseId?: string,
): Promise<AuditReport> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (warehouseId) params.warehouse_id = warehouseId;

  const { data, error } = await apiClient.get<AuditReport>("/reports/audit", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return unwrapOrThrow(data, error, "Unable to load audit report");
}

export async function getInventoryTrendReport(
  from?: string,
  to?: string,
  interval: TrendInterval = "day",
  warehouseId?: string,
): Promise<InventoryTrendReport> {
  const params: Record<string, string> = { interval };
  if (from) params.from = from;
  if (to) params.to = to;
  if (warehouseId) params.warehouse_id = warehouseId;

  const { data, error } = await apiClient.get<InventoryTrendReport>(
    "/reports/inventory-trend",
    { params },
  );

  return unwrapOrThrow(data, error, "Unable to load inventory trend report");
}

export async function getMaterialUsageTrendReport(
  from?: string,
  to?: string,
  interval: TrendInterval = "day",
  limit = 10,
  warehouseId?: string,
): Promise<MaterialUsageTrendReport> {
  const params: Record<string, string> = {
    interval,
    limit: String(limit),
  };
  if (from) params.from = from;
  if (to) params.to = to;
  if (warehouseId) params.warehouse_id = warehouseId;

  const { data, error } = await apiClient.get<MaterialUsageTrendReport>(
    "/reports/material-usage-trend",
    { params },
  );

  return unwrapOrThrow(
    data,
    error,
    "Unable to load material usage trend report",
  );
}

export async function getQcTrendReport(
  from?: string,
  to?: string,
  interval: TrendInterval = "day",
  limit = 10,
  warehouseId?: string,
): Promise<QcTrendReport> {
  const params: Record<string, string> = {
    interval,
    limit: String(limit),
  };
  if (from) params.from = from;
  if (to) params.to = to;
  if (warehouseId) params.warehouse_id = warehouseId;

  const { data, error } = await apiClient.get<QcTrendReport>(
    "/reports/qc-trend",
    {
      params,
    },
  );

  return unwrapOrThrow(data, error, "Unable to load QC trend report");
}

export async function getAuditTrendReport(
  from?: string,
  to?: string,
  interval: TrendInterval = "day",
  warehouseId?: string,
): Promise<AuditTrendReport> {
  const params: Record<string, string> = { interval };
  if (from) params.from = from;
  if (to) params.to = to;
  if (warehouseId) params.warehouse_id = warehouseId;

  const { data, error } = await apiClient.get<AuditTrendReport>(
    "/reports/audit-trend",
    {
      params,
    },
  );

  return unwrapOrThrow(data, error, "Unable to load audit trend report");
}
