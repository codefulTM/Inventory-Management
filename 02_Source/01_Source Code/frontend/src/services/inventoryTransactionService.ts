import { type InventoryTransaction } from "../types/inventoryTransaction";
import { apiClient } from "./apiClient";

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

export async function fetchTransactions(
  params: Record<string, any> = {},
): Promise<FetchTransactionsResult> {
  const requestParams = { ...params };

  const { data, error } = await apiClient.get<{ items: any[]; total: number }>(
    "/transactions",
    { params: requestParams },
  );

  if (error) {
    throw new Error(error.message || "Failed to fetch transactions");
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
    `/transactions/${id}`,
  );

  if (error) {
    throw new Error(error.message || "Failed to fetch transaction");
  }

  if (!data) {
    throw new Error("Failed to fetch transaction");
  }

  return normalize(data);
}

export async function createTransaction(
  payload: Partial<InventoryTransaction>,
) {
  const { data, error } = await apiClient.post<InventoryTransaction>(
    "/transactions",
    payload,
  );

  if (error) {
    throw new Error(error.message || "Failed to create transaction");
  }

  if (!data) {
    throw new Error("Failed to create transaction");
  }

  return normalize(data);
}

export async function createTransactionsBulk(
  payloads: Partial<InventoryTransaction>[],
) {
  const { data, error } = await apiClient.post<InventoryTransaction[]>(
    "/transactions/bulk",
    payloads,
  );

  if (error) {
    throw new Error(error.message || "Failed to bulk create transactions");
  }

  return Array.isArray(data) ? data.map(normalize) : [];
}

export async function updateTransaction(
  id: string,
  payload: Partial<InventoryTransaction>,
) {
  const { data, error } = await apiClient.patch<InventoryTransaction>(
    `/transactions/${id}`,
    payload,
  );

  if (error) {
    throw new Error(error.message || "Failed to update transaction");
  }

  if (!data) {
    throw new Error("Failed to update transaction");
  }

  return normalize(data);
}

export async function removeTransaction(id: string) {
  const { data, error } = await apiClient.delete<void>(`/transactions/${id}`);

  if (error) {
    throw new Error(error.message || "Failed to delete transaction");
  }

  return data;
}

export default {
  fetchTransactions,
  fetchTransaction,
  createTransaction,
  createTransactionsBulk,
  updateTransaction,
  removeTransaction,
};
