import { apiClient } from './apiClient';
import type {
  ProductionBatch,
  BatchComponent,
  PaginatedProductionBatch,
} from '../types/production';

// ─── Production Batch ─────────────────────────────────────────────────────────

export async function fetchProductionBatches(
  page = 1,
  limit = 20,
): Promise<PaginatedProductionBatch> {
  const { data, error } = await apiClient.get<PaginatedProductionBatch>(
    '/production-batches',
    { params: { page, limit } }
  );
  if (error) throw error;
  // Nếu data có data & pagination thì trả về nguyên object, nếu chỉ là mảng thì wrap lại
  if (data && Array.isArray((data as any).data) && (data as any).pagination) {
    return data as PaginatedProductionBatch;
  } else if (Array.isArray(data)) {
    // Trường hợp cũ trả về mảng, wrap lại cho đúng
    return { data: data as ProductionBatch[], pagination: { page, limit, total: (data as ProductionBatch[]).length, totalPages: 1 } };
  } else {
    throw new Error('API trả về không đúng định dạng');
  }
}

export async function fetchProductionBatchesByStatus(
  status: string,
  page = 1,
  limit = 20,
): Promise<PaginatedProductionBatch> {
  const { data, error } = await apiClient.get<PaginatedProductionBatch>(
    '/production-batches',
    { params: { status, page, limit } }
  );
  if (error) throw error;
  if (data && Array.isArray((data as any).data) && (data as any).pagination) {
    return data as PaginatedProductionBatch;
  } else if (Array.isArray(data)) {
    return { data: data as ProductionBatch[], pagination: { page, limit, total: (data as ProductionBatch[]).length, totalPages: 1 } };
  } else {
    throw new Error('API trả về không đúng định dạng');
  }
}

export async function fetchProductionBatch(id: string): Promise<ProductionBatch> {
  const { data, error } = await apiClient.get<ProductionBatch>(
    `/production-batches/${id}`
  );
  if (error) throw error;
  return data!;
}

export async function createProductionBatch(
  payload: Partial<ProductionBatch>,
): Promise<ProductionBatch> {
  const { data, error } = await apiClient.post<ProductionBatch>(
    '/production-batches',
    payload
  );
  if (error) throw error;
  console.log('🔧 createProductionBatch response data:', data);
  if (!data) {
    throw new Error('No data returned from createProductionBatch API');
  }
  return data;
}

export async function updateProductionBatch(
  id: string,
  payload: Partial<ProductionBatch>,
): Promise<ProductionBatch> {
  const { data, error } = await apiClient.patch<ProductionBatch>(
    `/production-batches/${id}`,
    payload
  );
  if (error) throw error;
  return data!;
}

export async function deleteProductionBatch(id: string): Promise<void> {
  const { error } = await apiClient.delete(
    `/production-batches/${id}`
  );
  if (error) throw error;
}

// ─── Batch Components ─────────────────────────────────────────────────────────

export async function fetchBatchComponents(
  batchId: string,
): Promise<BatchComponent[]> {
  const { data, error } = await apiClient.get<BatchComponent[]>(
    `/production-batches/${batchId}/components`
  );
  if (error) throw error;
  return data!;
}

export async function createBatchComponent(
  batchId: string,
  payload: Partial<BatchComponent>,
): Promise<BatchComponent> {
  const { data, error } = await apiClient.post<BatchComponent>(
    `/production-batches/${batchId}/components`,
    payload
  );
  if (error) throw error;
  return data!;
}

export async function updateBatchComponent(
  batchId: string,
  componentId: string,
  payload: Partial<BatchComponent>,
): Promise<BatchComponent> {
  const { data, error } = await apiClient.put<BatchComponent>(
    `/production-batches/${batchId}/components/${componentId}`,
    payload
  );
  if (error) throw error;
  return data!;
}

export async function deleteBatchComponent(
  batchId: string,
  componentId: string,
): Promise<void> {
  const { error } = await apiClient.delete(
    `/production-batches/${batchId}/components/${componentId}`
  );
  if (error) throw error;
}
