/**
 * Dashboard Service
 * Service gọi API dashboard: summary, trends (nhập/xuất), drilldown (chi tiết giao dịch)
 * Dữ liệu dùng cho Manager Dashboard
 */

import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api.config";

/**
 * Lấy tóm tắt dashboard (tổng quan số liệu)
 * @param warehouseId - Lọc theo kho (optional)
 * @param from - Ngày bắt đầu (ISO)
 * @param to - Ngày kết thúc (ISO)
 */
export async function getDashboardSummary(
  warehouseId?: string,
  from?: string,
  to?: string,
) {
  const url = API_ENDPOINTS.DASHBOARD_SUMMARY;
  const resp = await apiClient.get(url, { params: { warehouseId, from, to } });
  return resp;
}

/**
 * Lấy dữ liệu xu hướng nhập/xuất kho
 * @param metric - "in" (nhập) hoặc "out" (xuất)
 * @param from - Ngày bắt đầu
 * @param to - Ngày kết thúc
 * @param interval - Chu kỳ: "day" | "week" | "month"
 * @param warehouseId - Lọc theo kho
 */
export async function getDashboardTrends(
  metric: "in" | "out",
  from?: string,
  to?: string,
  interval?: "day" | "week" | "month",
  warehouseId?: string,
) {
  const url = API_ENDPOINTS.DASHBOARD_TRENDS;
  const resp = await apiClient.get(url, {
    params: { metric, from, to, interval, warehouseId },
  });
  return resp;
}

/**
 * Lấy chi tiết giao dịch (drilldown) từ một điểm trên biểu đồ
 * @param metric - "in" hoặc "out"
 * @param page - Trang hiện tại
 * @param limit - Số items mỗi trang
 * @param materialId - Lọc theo nguyên liệu
 * @param from - Ngày bắt đầu
 * @param to - Ngày kết thúc
 */
export async function getDashboardDrilldown(
  metric?: 'in' | 'out',
  page = 1,
  limit = 20,
  materialId?: string,
  from?: string,
  to?: string,
) {
  const url = API_ENDPOINTS.DASHBOARD_DRILLDOWN;
  const resp = await apiClient.get(url, {
    params: { metric, page, limit, materialId, from, to },
  });
  return resp;
}
