import { apiClient } from "./apiClient";
import type {
  Warehouse,
  PaginatedWarehouseResponse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
} from "../types/warehouse";

function normalize(w: any): Warehouse {
  return {
    ...w,
    warehouse_id: w.warehouse_id || w._id,
    _id: w._id || w.warehouse_id,
    created_date: w.created_date
      ? new Date(w.created_date).toISOString()
      : new Date().toISOString(),
  };
}

export async function fetchWarehouses(
  page = 1,
  limit = 20,
  q?: string,
): Promise<PaginatedWarehouseResponse> {
  const qs = new URLSearchParams();
  qs.append("page", String(page));
  qs.append("limit", String(limit));
  if (q) qs.append("q", q);
  const { data, error } = await apiClient.get<any>(
    `/warehouses?${qs.toString()}`,
  );
  if (error) throw error;
  // Backend returns paginated shape: { data, pagination }
  return {
    data: Array.isArray(data.data) ? data.data.map(normalize) : [],
    pagination: data.pagination || {
      page: 1,
      limit: 0,
      total: 0,
      totalPages: 1,
    },
  };
}

export async function fetchWarehouse(id: string): Promise<Warehouse> {
  const { data, error } = await apiClient.get<any>(`/warehouses/${id}`);
  if (error) throw error;
  return normalize(data);
}

export async function createWarehouse(payload: CreateWarehouseRequest) {
  const { data, error } = await apiClient.post<any>(`/warehouses`, payload);
  if (error) throw error;
  return normalize(data);
}

export async function updateWarehouse(
  id: string,
  payload: UpdateWarehouseRequest,
) {
  const { data, error } = await apiClient.put<any>(
    `/warehouses/${id}`,
    payload,
  );
  if (error) throw error;
  return normalize(data);
}

export async function removeWarehouse(id: string) {
  const { data, error } = await apiClient.delete<any>(`/warehouses/${id}`);
  if (error) throw error;
  return data;
}

export default {
  fetchWarehouses,
  fetchWarehouse,
  createWarehouse,
  updateWarehouse,
  removeWarehouse,
};
