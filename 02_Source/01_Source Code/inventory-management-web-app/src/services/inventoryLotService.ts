import { apiClient } from './apiClient';
import type { InventoryLot } from '../types/inventory';

export async function fetchInventoryLots(): Promise<InventoryLot[]> {
  const { data, error } = await apiClient.get<InventoryLot[]>('/inventory-lots');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createInventoryLot(payload: Partial<InventoryLot>): Promise<InventoryLot> {
  const { data, error } = await apiClient.post<InventoryLot>('/inventory-lots', payload);
  if (error) throw error;
  return data!;
}
