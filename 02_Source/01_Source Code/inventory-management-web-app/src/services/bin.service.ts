// File: services/bin.service.ts
// Service quản lý Bin (vị trí lưu kho) trong warehouse
// Các chức năng: Worklist, Chi tiết bin, Đếm hàng, Tạo/Cập nhật/Xóa bin

import { apiClient } from "./apiClient";

// Interface cho item trong bin worklist
export interface BinWorklistItem {
  bin_code: string;        // Mã bin
  expected_qty: number;    // Số lượng kỳ vọng
  warehouse_id?: string;    // Mã kho (tùy chọn)
  lots: Array<{ lot_id: string; material_id: string; qty: number }>; // Danh sách lot trong bin
  last_count_date?: string; // Ngày đếm gần nhất
}

// Class chứa các phương thức API liên quan đến Bin
export class BinAPI {
  static async getWorklist(params?: {
    warehouse_id?: string;
    page?: number;
    limit?: number;
    q?: string;
  }) {
    const { data, error } = await apiClient.get<{
      data: BinWorklistItem[];
      total: number;
      page: number;
      limit: number;
    }>("/bins/worklist", { params });
    if (error)
      return {
        items: [],
        total: 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
        error,
      };
    return {
      items: data.data || [],
      total: data.total ?? 0,
      page: data.page ?? 1,
      limit: data.limit ?? 50,
      error: null,
    };
  }

  static async getBinDetails(bin_code: string) {
    const { data, error } = await apiClient.get(
      `/bins/${encodeURIComponent(bin_code)}`,
    );
    if (error) return { bin: null, error };
    return { bin: data, error: null };
  }

  static async submitCounts(bin_code: string, payload: any) {
    const { data, error } = await apiClient.post(
      `/bins/${encodeURIComponent(bin_code)}/counts`,
      payload,
    );
    if (error) return { result: null, error };
    return { result: data, error: null };
  }

  static async fetchCounts(
    bin_code: string,
    params?: { page?: number; limit?: number },
  ) {
    const { data, error } = await apiClient.get(
      `/bins/${encodeURIComponent(bin_code)}/counts`,
      { params },
    );
    if (error)
      return {
        items: [],
        total: 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        error,
      };
    return {
      items: data.data || [],
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 20,
      error: null,
    };
  }

  static async createBin(payload: {
    bin_code: string;
    expected_qty?: number;
    warehouse_id?: string;
  }) {
    const { data, error } = await apiClient.post(`/bins`, payload);
    if (error) return { result: null, error };
    return { result: data, error: null };
  }

  static async updateBin(
    bin_code: string,
    payload: { expected_qty?: number; warehouse_id?: string },
  ) {
    const { data, error } = await apiClient.put(
      `/bins/${encodeURIComponent(bin_code)}`,
      payload,
    );
    if (error) return { result: null, error };
    return { result: data, error: null };
  }

  static async deleteBin(bin_code: string) {
    const { data, error } = await apiClient.delete(
      `/bins/${encodeURIComponent(bin_code)}`,
    );
    if (error) return { result: null, error };
    return { result: data, error: null };
  }
}
