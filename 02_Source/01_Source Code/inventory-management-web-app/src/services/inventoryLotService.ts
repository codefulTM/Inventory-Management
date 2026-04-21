import { apiClient } from "./apiClient";
import type { InventoryLot } from "../types/inventory";

export async function fetchInventoryLots(): Promise<InventoryLot[]> {
  const { data, error } =
    await apiClient.get<any>("/inventory-lots");
  if (error) throw error;
  return Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
}

export async function fetchInventoryLotOptions(params?: {
  warehouse_id?: string;
  material_id?: string;
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.warehouse_id) qs.append("warehouse_id", params.warehouse_id);
  if (params?.material_id) qs.append("material_id", params.material_id);
  if (params?.status) qs.append("status", params.status);
  if (params?.q) qs.append("q", params.q);
  qs.append("page", String(params?.page ?? 1));
  qs.append("limit", String(params?.limit ?? 100));

  const { data, error } = await apiClient.get<any>(
    `/inventory-lots/options?${qs.toString()}`,
  );
  if (error) throw error;
  // Expect { items: [...], pagination: { page, totalPages, total, limit } }
  return {
    items: data && data.items ? data.items : [],
    pagination:
      data && data.pagination
        ? data.pagination
        : {
            page: params?.page ?? 1,
            limit: params?.limit ?? 100,
            total: 0,
            totalPages: 1,
          },
  };
}

export async function createInventoryLot(
  payload: Partial<InventoryLot>,
): Promise<InventoryLot> {
  const { data, error } = await apiClient.post<InventoryLot>(
    "/inventory-lots",
    payload,
  );
  if (error) throw error;
  return data!;
}
