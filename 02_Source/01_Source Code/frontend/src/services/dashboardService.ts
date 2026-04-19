import { apiClient } from "./apiClient";

export async function getDashboardSummary(warehouseId?: string) {
  const url = "/dashboard/summary";
  const resp = await apiClient.get(url, { params: { warehouseId } });
  return resp;
}

export async function getDashboardTrends(
  metric: "in" | "out",
  from?: string,
  to?: string,
  interval?: "day" | "week" | "month",
  warehouseId?: string,
) {
  const url = "/dashboard/trends";
  const resp = await apiClient.get(url, {
    params: { metric, from, to, interval, warehouseId },
  });
  return resp;
}

export async function getDashboardDrilldown(
  page = 1,
  limit = 20,
  materialId?: string,
  from?: string,
  to?: string,
) {
  const url = "/dashboard/drilldown";
  const resp = await apiClient.get(url, {
    params: { page, limit, materialId, from, to },
  });
  return resp;
}
