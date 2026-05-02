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

/** Chuyển đổi giá trị ngày sang ISO string */
function toIso(value?: string | Date): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

/** Chuẩn hóa dữ liệu file đính kèm */
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

/** Chuẩn hóa dữ liệu vật tư đã xác nhận */
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

/** Chuẩn hóa dữ liệu đơn nhập/xuất kho (chuyển đổi ngày tháng, items, attachments) */
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

/** Xây dựng tham số truy vấn (chuyển đổi from/to sang ISO) */
function buildQueryParams(
  params: ImportExportOrderQueryParams = {},
): Record<string, unknown> {
  return {
    ...params,
    from: toIso(params.from),
    to: toIso(params.to),
  };
}

/**
 * Tạo mới đơn nhập/xuất kho
 * @param payload - Dữ liệu đơn (warehouse_id, order_type, items, v.v.)
 * @returns Thông tin đơn đã tạo (đã chuẩn hóa)
 */
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

/**
 * Lấy danh sách đơn nhập/xuất kho (phân trang, lọc)
 * @param params - Tham số lọc (page, limit, status, order_type, from, to, v.v.)
 * @returns Danh sách đơn và thông tin phân trang
 */
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

/**
 * Lấy danh sách công việc đơn nhập/xuất kho (worklist cho operator)
 * @param params - Tham số lọc (page, limit, status, v.v.)
 * @returns Danh sách đơn cần xử lý (phân trang)
 */
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

/**
 * Lấy chi tiết một đơn nhập/xuất kho
 * @param orderId - ID của đơn
 * @returns Thông tin chi tiết đơn (đã chuẩn hóa)
 */
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

/**
 * Cập nhật thông tin đơn nhập/xuất kho
 * @param orderId - ID của đơn cần cập nhật
 * @param payload - Dữ liệu cập nhật
 * @returns Thông tin đơn sau khi cập nhật (đã chuẩn hóa)
 */
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

/**
 * Xác nhận hoàn thành đơn nhập/xuất kho
 * @param orderId - ID của đơn cần xác nhận
 * @param payload - Dữ liệu xác nhận (confirmed_items, confirm_note, v.v.)
 * @returns Thông tin đơn sau khi xác nhận (đã chuẩn hóa)
 */
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

/**
 * Từ chối đơn nhập/xuất kho
 * @param orderId - ID của đơn bị từ chối
 * @param payload - Lý do từ chối và dữ liệu liên quan
 * @returns Thông tin đơn sau khi từ chối (đã chuẩn hóa)
 */
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

/**
 * Upload file đính kèm cho đơn nhập/xuất kho
 * @param orderId - ID của đơn
 * @param payload - Dữ liệu file (file, source)
 * @returns Thông tin đơn sau khi upload (đã chuẩn hóa)
 */
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

/**
 * Giải mã mã quét (barcode/QR) để xác định vật tư/lô hàng
 * @param scanCode - Mã quét được từ barcode/QR
 * @param orderType - Loại đơn (Inbound/Outbound) - tùy chọn
 * @returns Thông tin vật tư/lô hàng tương ứng (kèm warnings nếu có)
 */
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

/**
 * Lấy danh sách vật tư dạng options (dùng cho dropdown)
 * @param params - Tham số lọc (từ khóa q, trạng thái, phân trang)
 * @returns Danh sách vật tư và thông tin phân trang
 */
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

/**
 * Lấy danh sách lô hàng dạng options (dùng cho dropdown)
 * @param params - Tham số lọc (vật tư, kho, trạng thái, từ khóa, phân trang)
 * @returns Danh sách lô hàng và thông tin phân trang
 */
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

/**
 * Lấy danh sách kho dạng options (dùng cho dropdown)
 * @param params - Tham số lọc (từ khóa, trạng thái hoạt động, phân trang)
 * @returns Danh sách kho và thông tin phân trang
 */
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

/**
 * Lấy danh sách vị trí lưu kho dạng options (dùng cho dropdown)
 * @param params - Tham số lọc (kho, từ khóa, trạng thái, phân trang)
 * @returns Danh sách vị trí lưu kho và thông tin phân trang
 */
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
