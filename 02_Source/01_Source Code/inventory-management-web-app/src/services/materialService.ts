import { apiClient } from "./apiClient";
import type { Material } from "../types/material";

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

export async function fetchMaterials(): Promise<Material[]> {
  const { data, error } = await apiClient.get<any>("/materials");
  if (error) throw error;
  const list = Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
  return list.map(normalize);
}

export async function fetchMaterial(id: string): Promise<Material> {
  const { data, error } = await apiClient.get<any>(`/materials/${id}`);
  if (error) throw error;
  return normalize(data);
}

export async function createMaterial(payload: Partial<Material>) {
  const { data, error } = await apiClient.post<any>("/materials", payload);
  if (error) throw error;
  return normalize(data);
}

export async function updateMaterial(id: string, payload: Partial<Material>) {
  const { data, error } = await apiClient.put<any>(`/materials/${id}`, payload);
  if (error) throw error;
  return normalize(data);
}

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
