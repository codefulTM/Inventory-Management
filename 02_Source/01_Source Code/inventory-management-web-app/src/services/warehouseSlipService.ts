import { API_ENDPOINTS } from "../config/api.config";
import type { WarehouseSlip } from "../types/warehouseSlip";
import { apiClient } from "./apiClient";

export async function createWarehouseSlip(payload: Partial<WarehouseSlip>) {
  const { data, error } = await apiClient.post<any>(
    API_ENDPOINTS.WAREHOUSE_SLIPS,
    payload,
  );
  if (error) throw error;
  return data;
}

export async function fetchWarehouseSlips(query?: Record<string, any>) {
  const { data, error } = await apiClient.get<any>(
    API_ENDPOINTS.WAREHOUSE_SLIPS,
    {
      params: query,
    },
  );
  if (error) throw error;
  return data;
}

export async function fetchWarehouseSlip(id: string) {
  const { data, error } = await apiClient.get<any>(
    API_ENDPOINTS.WAREHOUSE_SLIP_DETAIL(id),
  );
  if (error) throw error;
  return data;
}

export async function uploadWarehouseSlipAttachment(
  id: string,
  formData: FormData,
) {
  const { data, error } = await apiClient.post<any>(
    API_ENDPOINTS.WAREHOUSE_SLIP_ATTACHMENTS(id),
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  if (error) throw error;
  return data;
}

export async function fetchWarehouseSlipPrintHtml(id: string) {
  const { data, error } = await apiClient.get<any>(
    API_ENDPOINTS.WAREHOUSE_SLIP_PRINT(id),
  );
  if (error) throw error;
  return data;
}

export async function approveWarehouseSlip(id: string, payload?: any) {
  const { data, error } = await apiClient.post<any>(
    API_ENDPOINTS.WAREHOUSE_SLIP_APPROVE(id),
    payload || {},
  );
  if (error) throw error;
  return data;
}

export async function rejectWarehouseSlip(id: string, reason: string) {
  const { data, error } = await apiClient.post<any>(
    API_ENDPOINTS.WAREHOUSE_SLIP_REJECT(id),
    { reason },
  );
  if (error) throw error;
  return data;
}
