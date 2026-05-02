/**
 * Reports Service
 * Service gọi API báo cáo: tồn kho, nguyên liệu, QC, audit và các báo cáo xu hướng
 * Tất cả hàm đều hỗ trợ lọc theo khoảng thời gian (from/to) và kho hàng (warehouseId)
 * Sử dụng unwrapOrThrow để chuẩn hóa error handling
 */

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

/**
 * Helper: unwrap data hoặc throw error nếu có vấn đề
 * @param data - Dữ liệu trả về từ API
 * @param error - Lỗi từ apiClient (nếu có)
 * @param fallback - Message mặc định nếu không có error message
 */
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

/**
 * Lấy báo cáo trạng thái tồn kho
 * @param from - Ngày bắt đầu (ISO)
 * @param to - Ngày kết thúc (ISO)
 * @param warehouseId - Lọc theo kho
 */
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

/**
 * Lấy báo cáo sử dụng nguyên liệu
 */
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

/**
 * Lấy báo cáo hiệu suất QC (chất lượng)
 */
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

/**
 * Lấy báo cáo audit (nhật ký hoạt động hệ thống)
 */
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

/**
 * Lấy báo cáo xu hướng tồn kho theo thời gian
 * @param interval - Chu kỳ: "day" | "week" | "month"
 */
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

/**
 * Lấy báo cáo xu hướng sử dụng nguyên liệu
 * @param limit - Số nguyên liệu top đầu (mặc định 10)
 */
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

/**
 * Lấy báo cáo xu hướng QC theo thời gian
 * @param limit - Số nhà cung cấp top đầu (mặc định 10)
 */
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

/**
 * Lấy báo cáo xu hướng audit (hoạt động hệ thống) theo thời gian
 */
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
