import { API_ENDPOINTS } from "../config/api.config";
import type { WarehouseSlip } from "../types/warehouseSlip";
import { apiClient } from "./apiClient";

/**
 * Tạo mới một phiếu nhập/xuất kho
 * @param payload - Dữ liệu phiếu (warehouse_id, type, items, v.v.)
 * @returns Thông tin phiếu đã tạo
 */
export async function createWarehouseSlip(payload: Partial<WarehouseSlip>) {
  const { data, error } = await apiClient.post<any>(
    API_ENDPOINTS.WAREHOUSE_SLIPS,
    payload,
  );
  if (error) throw error;
  return data;
}

/**
 * Lấy danh sách phiếu nhập/xuất kho (có thể lọc theo điều kiện)
 * @param query - Tham số lọc (status, type, warehouse_id, v.v.)
 * @returns Danh sách phiếu và thông tin phân trang
 */
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

/**
 * Lấy chi tiết một phiếu nhập/xuất kho theo ID
 * @param id - ID của phiếu
 * @returns Thông tin chi tiết phiếu
 */
export async function fetchWarehouseSlip(id: string) {
  const { data, error } = await apiClient.get<any>(
    API_ENDPOINTS.WAREHOUSE_SLIP_DETAIL(id),
  );
  if (error) throw error;
  return data;
}

/**
 * Upload file đính kèm cho phiếu nhập/xuất kho
 * @param id - ID của phiếu
 * @param formData - FormData chứa file cần upload
 * @returns Thông tin phiếu sau khi upload
 */
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

/**
 * Lấy HTML để in phiếu nhập/xuất kho
 * @param id - ID của phiếu
 * @returns Dữ liệu HTML dùng để in
 */
export async function fetchWarehouseSlipPrintHtml(id: string) {
  const { data, error } = await apiClient.get<any>(
    API_ENDPOINTS.WAREHOUSE_SLIP_PRINT(id),
  );
  if (error) throw error;
  return data;
}

/**
 * Phê duyệt phiếu nhập/xuất kho
 * @param id - ID của phiếu cần phê duyệt
 * @param payload - Dữ liệu bổ sung (ghi chú, v.v.)
 * @returns Thông tin phiếu sau khi phê duyệt
 */
export async function approveWarehouseSlip(id: string, payload?: any) {
  const { data, error } = await apiClient.post<any>(
    API_ENDPOINTS.WAREHOUSE_SLIP_APPROVE(id),
    payload || {},
  );
  if (error) throw error;
  return data;
}

/**
 * Từ chối phiếu nhập/xuất kho
 * @param id - ID của phiếu bị từ chối
 * @param reason - Lý do từ chối
 * @returns Thông tin phiếu sau khi từ chối
 */
export async function rejectWarehouseSlip(id: string, reason: string) {
  const { data, error } = await apiClient.post<any>(
    API_ENDPOINTS.WAREHOUSE_SLIP_REJECT(id),
    { reason },
  );
  if (error) throw error;
  return data;
}
