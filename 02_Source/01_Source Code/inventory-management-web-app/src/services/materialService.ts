/**
 * Material Service
 * Service quản lý nguyên liệu (Material)
 * CRUD: fetch, create, update, delete material
 */

import { apiClient } from "./apiClient";
import type { Material } from "../types/material";

/**
 * Chuẩn hóa dữ liệu material từ API response
 * Đảm bảo material_id và _id đồng nhất, format created_date
 */
function normalize(m: any): Material {
  return {
    ...m,
    material_id: m.material_id || m._id,
    _id: m._id || m.material_id,
    created_date: m.created_date
      ? new Date(m.created_date).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Lấy danh sách tất cả nguyên liệu
 */
export async function fetchMaterials(): Promise<Material[]> {
  const { data, error } = await apiClient.get<any>("/materials");
  if (error) throw error;
  const list = Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
  return list.map(normalize);
}

/**
 * Lấy chi tiết một nguyên liệu
 */
export async function fetchMaterial(id: string): Promise<Material> {
  const { data, error } = await apiClient.get<any>(`/materials/${id}`);
  if (error) throw error;
  return normalize(data);
}

/**
 * Tạo nguyên liệu mới
 */
export async function createMaterial(payload: Partial<Material>) {
  const { data, error } = await apiClient.post<any>("/materials", payload);
  if (error) throw error;
  return normalize(data);
}

/**
 * Cập nhật thông tin nguyên liệu
 */
export async function updateMaterial(id: string, payload: Partial<Material>) {
  const { data, error } = await apiClient.put<any>(`/materials/${id}`, payload);
  if (error) throw error;
  return normalize(data);
}

/**
 * Xóa nguyên liệu
 */
export async function removeMaterial(id: string) {
  const { data, error } = await apiClient.delete<any>(`/materials/${id}`);
  if (error) throw error;
  return data;
}

export default {
  fetchMaterials,
  fetchMaterial,
  createMaterial,
  updateMaterial,
  removeMaterial,
};
