import { API_ENDPOINTS } from "../config/api.config";
import type { WarehouseSlip } from "../types/warehouseSlip";
import { apiClient } from "./apiClient";

export async function createWarehouseSlip(payload: Partial<WarehouseSlip>) {
  try {
    const res = await apiClient.post(API_ENDPOINTS.WAREHOUSE_SLIPS, payload);
    return res.data;
  } catch (err: any) {
    throw err;
  }
}

export async function fetchWarehouseSlips(query?: Record<string, any>) {
  const res = await apiClient.get(API_ENDPOINTS.WAREHOUSE_SLIPS, {
    params: query,
  });
  return res.data;
}

export async function fetchWarehouseSlip(id: string) {
  const res = await apiClient.get(API_ENDPOINTS.WAREHOUSE_SLIP_DETAIL(id));
  return res.data;
}

export async function uploadWarehouseSlipAttachment(
  id: string,
  formData: FormData,
) {
  const res = await apiClient.post(
    API_ENDPOINTS.WAREHOUSE_SLIP_ATTACHMENTS(id),
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return res.data;
}

export async function fetchWarehouseSlipPrintHtml(id: string) {
  const res = await apiClient.get(API_ENDPOINTS.WAREHOUSE_SLIP_PRINT(id));
  return res.data;
}
