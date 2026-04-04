import { API_ENDPOINTS } from "../config/api.config";
import type {
  CreateInventoryAdjustmentRequest,
  CreateInventoryAdjustmentResponse,
  InventoryAdjustmentItem,
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

function toIso(value?: string | Date): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function normalizeItem(item: any): InventoryAdjustmentItem {
  return {
    ...item,
    adjustment_id: item.adjustment_id || item._id,
    adjustment_quantity: Number(item.adjustment_quantity ?? 0),
    quantity_before: Number(item.quantity_before ?? 0),
    quantity_after: Number(item.quantity_after ?? 0),
    unit_cost_snapshot: Number(item.unit_cost_snapshot ?? 0),
    valuation_before: Number(item.valuation_before ?? 0),
    valuation_after: Number(item.valuation_after ?? 0),
    valuation_delta: Number(item.valuation_delta ?? 0),
    created_date: item.created_date
      ? new Date(item.created_date).toISOString()
      : undefined,
    modified_date: item.modified_date
      ? new Date(item.modified_date).toISOString()
      : undefined,
  };
}

function buildQueryParams(
  params: InventoryAdjustmentListQuery = {},
): Record<string, unknown> {
  return {
    page: params.page,
    limit: params.limit,
    lot_id: params.lot_id || undefined,
    material_id: params.material_id || undefined,
    performed_by: params.performed_by || undefined,
    reason_code: params.reason_code || undefined,
    from: toIso(params.from),
    to: toIso(params.to),
  };
}

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

export async function fetchInventoryAdjustments(
  params: InventoryAdjustmentListQuery = {},
): Promise<InventoryAdjustmentListResponse> {
  const { data, error } = await apiClient.get<InventoryAdjustmentListResponse>(
    API_ENDPOINTS.INVENTORY_ADJUSTMENTS,
    {
      params: buildQueryParams(params),
    },
  );

  if (error) {
    throw toApiError(error, "Failed to fetch inventory adjustments");
  }

  if (!data) {
    return {
      items: [],
      total: 0,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
  }

  const items = Array.isArray(data.items)
    ? data.items.map((item) => normalizeItem(item))
    : [];

  return {
    items,
    total: typeof data.total === "number" ? data.total : items.length,
    page: typeof data.page === "number" ? data.page : (params.page ?? 1),
    limit: typeof data.limit === "number" ? data.limit : (params.limit ?? 20),
  };
}

export async function fetchInventoryAdjustmentDetail(
  adjustmentId: string,
): Promise<InventoryAdjustmentItem> {
  const { data, error } = await apiClient.get<InventoryAdjustmentItem>(
    API_ENDPOINTS.INVENTORY_ADJUSTMENTS_DETAIL(adjustmentId),
  );

  if (error || !data) {
    throw toApiError(error, "Failed to fetch inventory adjustment detail");
  }

  return normalizeItem(data);
}

export default {
  createInventoryAdjustment,
  fetchInventoryAdjustments,
  fetchInventoryAdjustmentDetail,
};
