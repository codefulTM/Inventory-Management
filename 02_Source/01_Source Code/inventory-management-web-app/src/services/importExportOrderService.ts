import { API_ENDPOINTS } from "../config/api.config";
import type {
  ConfirmImportExportOrderItem,
  ConfirmImportExportOrderPayload,
  CreateImportExportOrderPayload,
  InventoryLotOptionListResponse,
  ImportExportOrder,
  ImportExportOrderAttachment,
  ImportExportOrderItem,
  ImportExportOrderListResponse,
  ImportExportOrderQueryParams,
  ImportExportOrderType,
  MaterialOptionListResponse,
  RejectImportExportOrderPayload,
  ResolveImportExportOrderScanResult,
  StorageLocationOptionListResponse,
  UpdateImportExportOrderPayload,
  UploadImportExportOrderAttachmentPayload,
  WarehouseOptionListResponse,
} from "../types/importExportOrder";
import { apiClient } from "./apiClient";

export class ImportExportOrderApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "ImportExportOrderApiError";
    this.statusCode = statusCode;
  }
}

function toApiError(
  error: { message?: string; statusCode?: number } | null | undefined,
  fallbackMessage: string,
): ImportExportOrderApiError {
  return new ImportExportOrderApiError(
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

function normalizeAttachment(
  raw: Partial<ImportExportOrderAttachment> | undefined,
): ImportExportOrderAttachment {
  return {
    file_id: raw?.file_id ?? "",
    original_name: raw?.original_name ?? "",
    mime_type: raw?.mime_type ?? "",
    size_bytes: typeof raw?.size_bytes === "number" ? raw.size_bytes : 0,
    url: raw?.url ?? "",
    source: raw?.source ?? "upload",
    uploaded_by: raw?.uploaded_by ?? "",
    uploaded_at: raw?.uploaded_at
      ? new Date(raw.uploaded_at).toISOString()
      : new Date().toISOString(),
  };
}

function normalizeConfirmedItem(
  raw: Partial<ConfirmImportExportOrderItem> | undefined,
): ConfirmImportExportOrderItem {
  return {
    material_id: raw?.material_id ?? "",
    lot_id: raw?.lot_id,
    expected_quantity:
      typeof raw?.expected_quantity === "number" ? raw.expected_quantity : 0,
    actual_quantity:
      typeof raw?.actual_quantity === "number" ? raw.actual_quantity : 0,
    variance_quantity:
      typeof raw?.variance_quantity === "number" ? raw.variance_quantity : 0,
    unit_of_measure: raw?.unit_of_measure ?? "",
  };
}

function normalizeOrder(raw: Partial<ImportExportOrder>): ImportExportOrder {
  const normalizedItems: ImportExportOrderItem[] = Array.isArray(raw.items)
    ? raw.items
    : [];

  return {
    _id: raw._id,
    order_id: raw.order_id ?? "",
    order_type: raw.order_type ?? "Inbound",
    status: raw.status ?? "PendingConfirmation",
    warehouse_id: raw.warehouse_id ?? "",
    reason: raw.reason,
    reference_number: raw.reference_number,
    created_by: raw.created_by ?? "",
    items: normalizedItems,
    attachments: Array.isArray(raw.attachments)
      ? raw.attachments.map((attachment) => normalizeAttachment(attachment))
      : [],
    confirmed_by: raw.confirmed_by,
    confirmed_at: raw.confirmed_at
      ? new Date(raw.confirmed_at).toISOString()
      : undefined,
    confirm_note: raw.confirm_note,
    blind_count_required:
      typeof raw.blind_count_required === "boolean"
        ? raw.blind_count_required
        : undefined,
    confirmed_items: Array.isArray(raw.confirmed_items)
      ? raw.confirmed_items.map((item) => normalizeConfirmedItem(item))
      : [],
    created_date: raw.created_date
      ? new Date(raw.created_date).toISOString()
      : undefined,
    modified_date: raw.modified_date
      ? new Date(raw.modified_date).toISOString()
      : undefined,
  };
}

function buildQueryParams(
  params: ImportExportOrderQueryParams = {},
): Record<string, unknown> {
  return {
    ...params,
    from: toIso(params.from),
    to: toIso(params.to),
  };
}

export async function createImportExportOrder(
  payload: CreateImportExportOrderPayload,
): Promise<ImportExportOrder> {
  const { data, error } = await apiClient.post<ImportExportOrder>(
    API_ENDPOINTS.IMPORT_EXPORT_ORDERS,
    payload,
  );

  if (error || !data) {
    throw toApiError(error, "Failed to create import/export order");
  }

  return normalizeOrder(data);
}

export async function fetchImportExportOrders(
  params: ImportExportOrderQueryParams = {},
): Promise<ImportExportOrderListResponse> {
  const { data, error } = await apiClient.get<ImportExportOrderListResponse>(
    API_ENDPOINTS.IMPORT_EXPORT_ORDERS,
    {
      params: buildQueryParams(params),
    },
  );

  if (error) {
    throw toApiError(error, "Failed to fetch import/export order history");
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
    ? data.items.map((item) => normalizeOrder(item))
    : [];

  return {
    items,
    total: typeof data.total === "number" ? data.total : items.length,
    page: typeof data.page === "number" ? data.page : (params.page ?? 1),
    limit: typeof data.limit === "number" ? data.limit : (params.limit ?? 20),
  };
}

export async function fetchImportExportOrderWorklist(
  params: ImportExportOrderQueryParams = {},
): Promise<ImportExportOrderListResponse> {
  const { data, error } = await apiClient.get<ImportExportOrderListResponse>(
    API_ENDPOINTS.IMPORT_EXPORT_ORDER_WORKLIST,
    {
      params: buildQueryParams(params),
    },
  );

  if (error) {
    throw toApiError(error, "Failed to fetch import/export order worklist");
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
    ? data.items.map((item) => normalizeOrder(item))
    : [];

  return {
    items,
    total: typeof data.total === "number" ? data.total : items.length,
    page: typeof data.page === "number" ? data.page : (params.page ?? 1),
    limit: typeof data.limit === "number" ? data.limit : (params.limit ?? 20),
  };
}

export async function fetchImportExportOrderDetail(
  orderId: string,
): Promise<ImportExportOrder> {
  const { data, error } = await apiClient.get<ImportExportOrder>(
    API_ENDPOINTS.IMPORT_EXPORT_ORDER_DETAIL(orderId),
  );

  if (error || !data) {
    throw toApiError(error, "Failed to fetch import/export order");
  }

  return normalizeOrder(data);
}

export async function updateImportExportOrder(
  orderId: string,
  payload: UpdateImportExportOrderPayload,
): Promise<ImportExportOrder> {
  const { data, error } = await apiClient.patch<ImportExportOrder>(
    API_ENDPOINTS.IMPORT_EXPORT_ORDER_DETAIL(orderId),
    payload,
  );

  if (error) {
    throw toApiError(error, "Failed to update import/export order");
  }

  if (data) {
    return normalizeOrder(data);
  }

  return fetchImportExportOrderDetail(orderId);
}

export async function confirmImportExportOrder(
  orderId: string,
  payload: ConfirmImportExportOrderPayload,
): Promise<ImportExportOrder> {
  const { data, error } = await apiClient.post<ImportExportOrder>(
    API_ENDPOINTS.IMPORT_EXPORT_ORDER_CONFIRM(orderId),
    payload,
  );

  if (error) {
    throw toApiError(error, "Failed to confirm import/export order");
  }

  if (data) {
    return normalizeOrder(data);
  }

  return fetchImportExportOrderDetail(orderId);
}

export async function rejectImportExportOrder(
  orderId: string,
  payload: RejectImportExportOrderPayload,
): Promise<ImportExportOrder> {
  const { data, error } = await apiClient.post<ImportExportOrder>(
    API_ENDPOINTS.IMPORT_EXPORT_ORDER_REJECT(orderId),
    payload,
  );

  if (error) {
    throw toApiError(error, "Failed to reject import/export order");
  }

  if (data) {
    return normalizeOrder(data);
  }

  return fetchImportExportOrderDetail(orderId);
}

export async function uploadImportExportOrderAttachment(
  orderId: string,
  payload: UploadImportExportOrderAttachmentPayload,
): Promise<ImportExportOrder> {
  const formData = new FormData();
  formData.append("file", payload.file);

  if (payload.source) {
    formData.append("source", payload.source);
  }

  const { data, error } = await apiClient.post<ImportExportOrder>(
    API_ENDPOINTS.IMPORT_EXPORT_ORDER_ATTACHMENTS(orderId),
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  if (error) {
    throw toApiError(error, "Failed to upload attachment");
  }

  if (data) {
    return normalizeOrder(data);
  }

  return fetchImportExportOrderDetail(orderId);
}

export async function resolveImportExportOrderScan(
  scanCode: string,
  orderType?: ImportExportOrderType,
): Promise<ResolveImportExportOrderScanResult> {
  const normalizedCode = scanCode.trim();

  if (!normalizedCode) {
    throw new Error("scan_code is required");
  }

  const { data, error } =
    await apiClient.post<ResolveImportExportOrderScanResult>(
      API_ENDPOINTS.IMPORT_EXPORT_ORDER_SCAN_RESOLVE,
      {
        scan_code: normalizedCode,
        order_type: orderType,
      },
    );

  if (error || !data) {
    throw toApiError(error, "Failed to resolve scan code");
  }

  return {
    ...data,
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
  };
}

export async function fetchMaterialOptions(params?: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<MaterialOptionListResponse> {
  const { data, error } = await apiClient.get<MaterialOptionListResponse>(
    API_ENDPOINTS.MATERIALS_OPTIONS,
    {
      params,
    },
  );

  if (error || !data) {
    throw toApiError(error, "Failed to fetch material options");
  }

  const items = Array.isArray(data.data) ? data.data : [];

  return {
    data: items,
    total: typeof data.total === "number" ? data.total : items.length,
    page: typeof data.page === "number" ? data.page : (params?.page ?? 1),
    limit: typeof data.limit === "number" ? data.limit : (params?.limit ?? 20),
  };
}

export async function fetchInventoryLotOptions(params?: {
  q?: string;
  material_id?: string;
  status?: string;
  exclude_status?: string;
  warehouse_id?: string;
  page?: number;
  limit?: number;
}): Promise<InventoryLotOptionListResponse> {
  const { data, error } = await apiClient.get<InventoryLotOptionListResponse>(
    API_ENDPOINTS.INVENTORY_LOTS_OPTIONS,
    {
      params,
    },
  );

  if (error || !data) {
    throw toApiError(error, "Failed to fetch inventory lot options");
  }

  const items = Array.isArray(data.items) ? data.items : [];

  return {
    items,
    total: typeof data.total === "number" ? data.total : items.length,
    page: typeof data.page === "number" ? data.page : (params?.page ?? 1),
    limit: typeof data.limit === "number" ? data.limit : (params?.limit ?? 20),
  };
}

export async function fetchWarehouseOptions(params?: {
  q?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}): Promise<WarehouseOptionListResponse> {
  const { data, error } = await apiClient.get<WarehouseOptionListResponse>(
    API_ENDPOINTS.IMPORT_EXPORT_WAREHOUSES_OPTIONS,
    {
      params,
    },
  );

  if (error || !data) {
    throw toApiError(error, "Failed to fetch warehouse options");
  }

  const items = Array.isArray(data.items) ? data.items : [];

  return {
    items,
    total: typeof data.total === "number" ? data.total : items.length,
    page: typeof data.page === "number" ? data.page : (params?.page ?? 1),
    limit: typeof data.limit === "number" ? data.limit : (params?.limit ?? 20),
  };
}

export async function fetchStorageLocationOptions(params?: {
  warehouse_id?: string;
  q?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}): Promise<StorageLocationOptionListResponse> {
  const { data, error } =
    await apiClient.get<StorageLocationOptionListResponse>(
      API_ENDPOINTS.IMPORT_EXPORT_STORAGE_LOCATIONS_OPTIONS,
      {
        params,
      },
    );

  if (error || !data) {
    throw toApiError(error, "Failed to fetch storage location options");
  }

  const items = Array.isArray(data.items) ? data.items : [];

  return {
    items,
    total: typeof data.total === "number" ? data.total : items.length,
    page: typeof data.page === "number" ? data.page : (params?.page ?? 1),
    limit: typeof data.limit === "number" ? data.limit : (params?.limit ?? 20),
  };
}

export const importExportOrderService = {
  createImportExportOrder,
  fetchImportExportOrders,
  fetchImportExportOrderWorklist,
  fetchImportExportOrderDetail,
  updateImportExportOrder,
  confirmImportExportOrder,
  rejectImportExportOrder,
  uploadImportExportOrderAttachment,
  resolveImportExportOrderScan,
  fetchMaterialOptions,
  fetchInventoryLotOptions,
  fetchWarehouseOptions,
  fetchStorageLocationOptions,
};
