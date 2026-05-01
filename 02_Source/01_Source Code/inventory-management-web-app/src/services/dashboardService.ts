import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api.config";

export async function getDashboardSummary(
  warehouseId?: string,
  from?: string,
  to?: string,
) {
  const url = API_ENDPOINTS.DASHBOARD_SUMMARY;
  const resp = await apiClient.get(url, { params: { warehouseId, from, to } });
  return resp;
}

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
