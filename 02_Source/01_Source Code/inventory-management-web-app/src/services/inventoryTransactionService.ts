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

function toIso(value?: string | Date): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

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

export interface FetchTransactionsResult {
  items: InventoryTransaction[];
  total: number;
}

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

export async function removeTransaction(id: string) {
  const { data, error } = await apiClient.delete<void>(
    API_ENDPOINTS.TRANSACTIONS_DETAIL(id),
  );

  if (error) {
    throw toApiError(error, "Failed to delete transaction");
  }

  return data;
}

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
