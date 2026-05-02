import { API_ENDPOINTS } from "../config/api.config";
import type {
  CreateInventoryAdjustmentRequest,
  CreateInventoryAdjustmentResponse,
  InventoryAdjustmentListQuery,
  InventoryAdjustmentListResponse,
} from "../types/inventoryAdjustment";
import { apiClient } from "./apiClient";

export class InventoryAdjustmentApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "InventoryAdjustmentApiError";
    this.statusCode = statusCode;
  }
}

function toApiError(
  error: { message?: string; statusCode?: number } | null | undefined,
  fallbackMessage: string,
): InventoryAdjustmentApiError {
  return new InventoryAdjustmentApiError(
    error?.message || fallbackMessage,
    error?.statusCode,
  );
}

/**
 * Tạo mới điều chỉnh tồn kho
 * @param payload - Dữ liệu điều chỉnh (material_id, lot_id, quantity, reason, v.v.)
 * @returns Thông tin điều chỉnh đã tạo (có valuation_before, valuation_after, valuation_delta)
 */
export async function createInventoryAdjustment(
  payload: CreateInventoryAdjustmentRequest,
): Promise<CreateInventoryAdjustmentResponse> {
  const { data, error } =
    await apiClient.post<CreateInventoryAdjustmentResponse>(
      API_ENDPOINTS.INVENTORY_ADJUSTMENTS,
      payload,
    );

  if (error || !data) {
    throw toApiError(error, "Failed to create inventory adjustment");
  }

  return {
    ...data,
    valuation_before: Number(data.valuation_before ?? 0),
    valuation_after: Number(data.valuation_after ?? 0),
    valuation_delta: Number(data.valuation_delta ?? 0),
  };
}

/**
 * Lấy danh sách lịch sử điều chỉnh tồn kho (phân trang)
 * @param query - Tham số truy vấn (page, limit, material_id, warehouse_id, v.v.)
 * @returns Danh sách điều chỉnh và thông tin phân trang
 */
export async function fetchInventoryAdjustments(
  query: InventoryAdjustmentListQuery = {},
): Promise<InventoryAdjustmentListResponse> {
  const { data, error } = await apiClient.get<InventoryAdjustmentListResponse>(
    API_ENDPOINTS.INVENTORY_ADJUSTMENTS,
    {
      params: query,
    },
  );

  if (error || !data) {
    throw toApiError(error, "Failed to fetch inventory adjustment history");
  }

  const items = Array.isArray(data.items) ? data.items : [];

  return {
    items,
    total: typeof data.total === "number" ? data.total : items.length,
    page: typeof data.page === "number" ? data.page : (query.page ?? 1),
    limit: typeof data.limit === "number" ? data.limit : (query.limit ?? 10),
  };
}

export default {
  createInventoryAdjustment,
  fetchInventoryAdjustments,
};
