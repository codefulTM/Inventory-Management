import { apiClient } from './apiClient';
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
} from '../types/reports';

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

export async function getInventoryStatusReport(): Promise<InventoryStatusReport> {
  const { data, error } = await apiClient.get<InventoryStatusReport>(
    '/reports/inventory-status',
  );
  return unwrapOrThrow(data, error, 'Unable to load inventory status report');
}

export async function getMaterialUsageReport(
  from?: string,
  to?: string,
): Promise<MaterialUsageReport> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, error } = await apiClient.get<MaterialUsageReport>(
    '/reports/material-usage',
    { params: Object.keys(params).length > 0 ? params : undefined },
  );

  return unwrapOrThrow(data, error, 'Unable to load material usage report');
}

export async function getQcPerformanceReport(): Promise<QcPerformanceReport> {
  const { data, error } = await apiClient.get<QcPerformanceReport>(
    '/reports/qc-performance',
  );
  return unwrapOrThrow(data, error, 'Unable to load QC performance report');
}

export async function getAuditReport(): Promise<AuditReport> {
  const { data, error } = await apiClient.get<AuditReport>('/reports/audit');
  return unwrapOrThrow(data, error, 'Unable to load audit report');
}

export async function getInventoryTrendReport(
  from?: string,
  to?: string,
  interval: TrendInterval = 'day',
): Promise<InventoryTrendReport> {
  const params: Record<string, string> = { interval };
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, error } = await apiClient.get<InventoryTrendReport>(
    '/reports/inventory-trend',
    { params },
  );

  return unwrapOrThrow(data, error, 'Unable to load inventory trend report');
}

export async function getMaterialUsageTrendReport(
  from?: string,
  to?: string,
  interval: TrendInterval = 'day',
  limit = 10,
): Promise<MaterialUsageTrendReport> {
  const params: Record<string, string> = {
    interval,
    limit: String(limit),
  };
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, error } = await apiClient.get<MaterialUsageTrendReport>(
    '/reports/material-usage-trend',
    { params },
  );

  return unwrapOrThrow(data, error, 'Unable to load material usage trend report');
}

export async function getQcTrendReport(
  from?: string,
  to?: string,
  interval: TrendInterval = 'day',
  limit = 10,
): Promise<QcTrendReport> {
  const params: Record<string, string> = {
    interval,
    limit: String(limit),
  };
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, error } = await apiClient.get<QcTrendReport>('/reports/qc-trend', {
    params,
  });

  return unwrapOrThrow(data, error, 'Unable to load QC trend report');
}

export async function getAuditTrendReport(
  from?: string,
  to?: string,
  interval: TrendInterval = 'day',
): Promise<AuditTrendReport> {
  const params: Record<string, string> = { interval };
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, error } = await apiClient.get<AuditTrendReport>('/reports/audit-trend', {
    params,
  });

  return unwrapOrThrow(data, error, 'Unable to load audit trend report');
}
