import { API_ENDPOINTS } from "../config/api.config";
import type {
  InventoryTransaction,
  MyHistoryItem,
  MyHistoryListResponse,
  MyHistoryQuery,
} from "../types/inventoryTransaction";
import { apiClient } from "./apiClient";

export class InventoryTransactionApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "InventoryTransactionApiError";
    this.statusCode = statusCode;
  }
}

function toApiError(
  error: { message?: string; statusCode?: number } | null | undefined,
  fallbackMessage: string,
): InventoryTransactionApiError {
  return new InventoryTransactionApiError(
    error?.message || fallbackMessage,
    error?.statusCode,
  );
}

/**
 * Chuyển đổi giá trị ngày sang định dạng ISO string
 * @param value - Ngày dạng string hoặc Date object
 * @returns ISO string hoặc undefined
 */
function toIso(value?: string | Date): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

/**
 * Chuẩn hóa dữ liệu giao dịch tồn kho
 * Chuyển đổi các trường số (quantity) và ngày tháng sang định dạng chuẩn
 */
function normalize(t: any): InventoryTransaction {
  return {
    ...t,
    transaction_id: t.transaction_id || t._id,
    quantity: Number(
      typeof t.quantity === "object" && t.quantity.$numberDecimal
        ? t.quantity.$numberDecimal
        : t.quantity,
    ), // convert Decimal128 wrapper if present
    _id: t._id || t.transaction_id,
    transaction_date: t.transaction_date
      ? new Date(t.transaction_date).toISOString()
      : new Date().toISOString(),
    created_date: t.created_date
      ? new Date(t.created_date).toISOString()
      : new Date().toISOString(),
    modified_date: t.modified_date
      ? new Date(t.modified_date).toISOString()
      : new Date().toISOString(),
  };
}

/** Kết quả trả về khi lấy danh sách giao dịch */
export interface FetchTransactionsResult {
  items: InventoryTransaction[];
  total: number;
}

/**
 * Xây dựng tham số tìm kiếm cho lịch sử giao dịch cá nhân
 * Tự động chuyển đổi ngày (from/to) sang ISO string (đầu ngày/ cuối ngày)
 */
function buildMyHistoryParams(
  params: MyHistoryQuery = {},
): Record<string, unknown> {
  const normalizedKeyword =
    typeof params.keyword === "string" ? params.keyword.trim() : undefined;

  // Convert date-only strings (YYYY-MM-DD) to ISO datetimes representing
  // start/end of day so backend receives a full datetime range.
  function toStartIso(value?: string | Date): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) {
      const d = new Date(value);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    // value is string
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  function toEndIso(value?: string | Date): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) {
      const d = new Date(value);
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }

  return {
    page: params.page,
    limit: params.limit,
    from: toStartIso(params.from),
    to: toEndIso(params.to),
    transaction_type: params.transaction_type,
    keyword: normalizedKeyword || undefined,
  };
}

/**
 * Lấy danh sách giao dịch tồn kho (có phân trang, lọc)
 * @param params - Tham số lọc (page, limit, transaction_type, từ ngày đến ngày, v.v.)
 * @returns Danh sách giao dịch đã chuẩn hóa và tổng số bản ghi
 */
export async function fetchTransactions(
  params: Record<string, any> = {},
): Promise<FetchTransactionsResult> {
  const requestParams = { ...params };

  const { data, error } = await apiClient.get<{ items: any[]; total: number }>(
    API_ENDPOINTS.TRANSACTIONS,
    { params: requestParams },
  );

  if (error) {
    throw toApiError(error, "Failed to fetch transactions");
  }

  const payload = data ?? { items: [], total: 0 };
  if (Array.isArray(payload.items)) {
    return { items: payload.items.map(normalize), total: payload.total || 0 };
  }

  // fallback when API returns plain array
  return {
    items: Array.isArray(payload) ? payload.map(normalize) : [],
    total: 0,
  };
}

/**
 * Lấy chi tiết một giao dịch tồn kho theo ID
 * @param id - ID của giao dịch
 * @returns Thông tin chi tiết giao dịch (đã chuẩn hóa)
 */
export async function fetchTransaction(
  id: string,
): Promise<InventoryTransaction> {
  const { data, error } = await apiClient.get<InventoryTransaction>(
    API_ENDPOINTS.TRANSACTIONS_DETAIL(id),
  );

  if (error) {
    throw toApiError(error, "Failed to fetch transaction");
  }

  if (!data) {
    throw new InventoryTransactionApiError("Failed to fetch transaction");
  }

  return normalize(data);
}

/**
 * Tạo mới một giao dịch tồn kho
 * @param payload - Dữ liệu giao dịch (material_id, lot_id, quantity, transaction_type, v.v.)
 * @returns Giao dịch đã tạo (đã chuẩn hóa)
 */
export async function createTransaction(
  payload: Partial<InventoryTransaction>,
) {
  const { data, error } = await apiClient.post<InventoryTransaction>(
    API_ENDPOINTS.TRANSACTIONS,
    payload,
  );

  if (error) {
    throw toApiError(error, "Failed to create transaction");
  }

  if (!data) {
    throw new InventoryTransactionApiError("Failed to create transaction");
  }

  return normalize(data);
}

/**
 * Tạo nhiều giao dịch tồn kho cùng lúc (bulk create)
 * @param payloads - Mảng dữ liệu các giao dịch cần tạo
 * @returns Danh sách giao dịch đã tạo (đã chuẩn hóa)
 */
export async function createTransactionsBulk(
  payloads: Partial<InventoryTransaction>[],
) {
  const { data, error } = await apiClient.post<InventoryTransaction[]>(
    API_ENDPOINTS.TRANSACTIONS_BULK,
    payloads,
  );

  if (error) {
    throw toApiError(error, "Failed to bulk create transactions");
  }

  return Array.isArray(data) ? data.map(normalize) : [];
}

/**
 * Cập nhật thông tin giao dịch tồn kho
 * @param id - ID của giao dịch cần cập nhật
 * @param payload - Dữ liệu cần cập nhật
 * @returns Giao dịch sau khi cập nhật (đã chuẩn hóa)
 */
export async function updateTransaction(
  id: string,
  payload: Partial<InventoryTransaction>,
) {
  const { data, error } = await apiClient.patch<InventoryTransaction>(
    API_ENDPOINTS.TRANSACTIONS_DETAIL(id),
    payload,
  );

  if (error) {
    throw toApiError(error, "Failed to update transaction");
  }

  if (!data) {
    throw new InventoryTransactionApiError("Failed to update transaction");
  }

  return normalize(data);
}

/**
 * Xóa một giao dịch tồn kho
 * @param id - ID của giao dịch cần xóa
 * @returns Thông báo kết quả
 */
export async function removeTransaction(id: string) {
  const { data, error } = await apiClient.delete<void>(
    API_ENDPOINTS.TRANSACTIONS_DETAIL(id),
  );

  if (error) {
    throw toApiError(error, "Failed to delete transaction");
  }

  return data;
}

/**
 * Lấy lịch sử giao dịch cá nhân (phân trang, lọc theo ngày loại giao dịch)
 * @param params - Tham số tìm kiếm (page, limit, from, to, transaction_type, keyword)
 * @returns Danh sách giao dịch cá nhân và tổng số bản ghi
 */
export async function fetchMyHistory(
  params: MyHistoryQuery = {},
): Promise<MyHistoryListResponse> {
  const { data, error } = await apiClient.get<MyHistoryListResponse>(
    API_ENDPOINTS.TRANSACTIONS_MY_HISTORY,
    {
      params: buildMyHistoryParams(params),
    },
  );

  if (error) {
    throw toApiError(error, "Failed to fetch my transaction history");
  }

  if (!data) {
    return {
      items: [],
      total: 0,
    };
  }

  return {
    items: Array.isArray(data.items)
      ? data.items.map((item) => normalize(item) as MyHistoryItem)
      : [],
    total: typeof data.total === "number" ? data.total : 0,
  };
}

/**
 * Lấy chi tiết một giao dịch trong lịch sử cá nhân
 * @param transactionId - ID của giao dịch
 * @returns Thông tin chi tiết giao dịch (đã chuẩn hóa)
 */
export async function fetchMyHistoryDetail(
  transactionId: string,
): Promise<MyHistoryItem> {
  const { data, error } = await apiClient.get<MyHistoryItem>(
    API_ENDPOINTS.TRANSACTIONS_MY_HISTORY_DETAIL(transactionId),
  );

  if (error || !data) {
    throw toApiError(error, "Failed to fetch transaction history detail");
  }

  return normalize(data) as MyHistoryItem;
}

export default {
  fetchTransactions,
  fetchTransaction,
  createTransaction,
  createTransactionsBulk,
  updateTransaction,
  removeTransaction,
  fetchMyHistory,
  fetchMyHistoryDetail,
};
