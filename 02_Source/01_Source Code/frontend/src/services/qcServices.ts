import type {
  DashboardKPI,
  InventoryLot,
  QCTest,
  SupplierPerformance,
  SupplierAnalysisResponse,
  CreateQCTestDto,
  LotDecisionDto,
  RetestDto,
} from '../types/qc';
import { apiClient } from './apiClient';
import { safeApiCall } from './errorLogger';
import { fetchMaterials } from './materialService';

type RawInventoryLot = Omit<InventoryLot, 'material_name'> & {
  material_name?: string;
  material_id?: string;
  material?: {
    material_id?: string;
    material_name?: string;
  };
};

function requireData<T>(
  data: T | null,
  error: { message?: string } | null,
  fallbackMessage: string,
): T {
  if (error) {
    throw new Error(error.message ?? fallbackMessage);
  }

  if (data === null || data === undefined) {
    throw new Error(fallbackMessage);
  }

  return data;
}

function normalizeListPayload<T>(payload: T[] | { data: T[] }): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return [];
}

export async function getDashboardKPI(): Promise<DashboardKPI> {
  return safeApiCall('qcServices.getDashboardKPI', async () => {
    const { data, error } = await apiClient.get<DashboardKPI>('/qc-tests/dashboard');
    return requireData(data, error, 'Unable to fetch QC dashboard KPI');
  });
}

export async function getInventoryLots(status?: string): Promise<InventoryLot[]> {
  return safeApiCall('qcServices.getInventoryLots', async () => {
    const { data, error } = await apiClient.get<RawInventoryLot[] | { data: RawInventoryLot[] }>(
      '/inventory-lots',
      {
        params: status ? { status } : undefined,
      },
    );

    const payload = requireData(data, error, 'Unable to fetch inventory lots');
    const lots = normalizeListPayload(payload);

    let materialNameById = new Map<string, string>();
    try {
      const materials = await fetchMaterials();
      materialNameById = new Map(
        materials
          .filter((material) => Boolean(material.material_id && material.material_name))
          .map((material) => [material.material_id, material.material_name]),
      );
    } catch {
      // Do not block lot listing when material catalog cannot be loaded.
    }

    return lots.map((lot) => {
      const materialId = lot.material_id ?? lot.material?.material_id;
      const resolvedMaterialName =
        lot.material_name ??
        lot.material?.material_name ??
        (materialId ? materialNameById.get(materialId) : undefined) ??
        '';

      return {
        ...lot,
        material_name: resolvedMaterialName,
      };
    });
  });
}

export async function getQCTestsByLot(lot_id: string): Promise<QCTest[]> {
  return safeApiCall('qcServices.getQCTestsByLot', async () => {
    const { data, error } = await apiClient.get<QCTest[]>(
      `/qc-tests/lot/${encodeURIComponent(lot_id)}`,
    );

    return requireData(data, error, 'Unable to fetch QC tests for lot');
  });
}

export async function getAllQCTests(): Promise<QCTest[]> {
  return safeApiCall('qcServices.getAllQCTests', async () => {
    const { data, error } = await apiClient.get<QCTest[]>('/qc-tests');
    return requireData(data, error, 'Unable to fetch QC tests');
  });
}

export async function createQCTest(payload: CreateQCTestDto): Promise<QCTest> {
  return safeApiCall('qcServices.createQCTest', async () => {
    const { data, error } = await apiClient.post<QCTest>('/qc-tests', payload);
    return requireData(data, error, 'Unable to create QC test');
  });
}

export async function updateQCTest(
  test_id: string,
  payload: Partial<QCTest>,
): Promise<QCTest> {
  return safeApiCall('qcServices.updateQCTest', async () => {
    const { data, error } = await apiClient.patch<QCTest>(
      `/qc-tests/${encodeURIComponent(test_id)}`,
      payload,
    );

    return requireData(data, error, 'Unable to update QC test');
  });
}

export async function deleteQCTest(test_id: string): Promise<void> {
  return safeApiCall('qcServices.deleteQCTest', async () => {
    const { error } = await apiClient.delete(`/qc-tests/${encodeURIComponent(test_id)}`);
    if (error) {
      throw new Error(error.message ?? 'Unable to delete QC test');
    }
  });
}

export async function submitLotDecision(
  lot_id: string,
  payload: LotDecisionDto,
): Promise<unknown> {
  return safeApiCall('qcServices.submitLotDecision', async () => {
    const { data, error } = await apiClient.post<unknown>(
      `/qc-tests/lot/${encodeURIComponent(lot_id)}/decision`,
      payload,
    );

    return requireData(data, error, 'Unable to submit lot decision');
  });
}

export async function submitRetest(
  lot_id: string,
  payload: RetestDto,
): Promise<unknown> {
  return safeApiCall('qcServices.submitRetest', async () => {
    const { data, error } = await apiClient.post<unknown>(
      `/qc-tests/lot/${encodeURIComponent(lot_id)}/retest`,
      payload,
    );

    return requireData(data, error, 'Unable to submit retest request');
  });
}

export async function bulkQuarantine(lot_ids: string[]): Promise<{ updated: number }> {
  return safeApiCall('qcServices.bulkQuarantine', async () => {
    const { data, error } = await apiClient.post<{ updated: number }>(
      '/inventory-lots/bulk-quarantine',
      { lot_ids },
    );

    return requireData(data, error, 'Unable to quarantine lots');
  });
}

export async function getSupplierPerformance(
  from?: string,
  to?: string,
): Promise<SupplierPerformance[]> {
  return safeApiCall('qcServices.getSupplierPerformance', async () => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const { data, error } = await apiClient.get<SupplierPerformance[]>(
      '/qc-tests/supplier-performance',
      { params: Object.keys(params).length > 0 ? params : undefined },
    );

    return requireData(data, error, 'Unable to fetch supplier performance');
  });
}

export async function analyzeAllSuppliers(
  from?: string,
  to?: string,
): Promise<SupplierAnalysisResponse> {
  return safeApiCall('qcServices.analyzeAllSuppliers', async () => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const { data, error } = await apiClient.get<SupplierAnalysisResponse>(
      '/ai/supplier-analysis',
      {
        params: Object.keys(params).length > 0 ? params : undefined,
        // AI analysis may take longer than the default 30s API timeout.
        timeout: 90000,
      },
    );

    return requireData(data, error, 'Unable to analyze suppliers');
  });
}

export async function analyzeOneSupplier(
  supplierName: string,
  from?: string,
  to?: string,
): Promise<SupplierAnalysisResponse> {
  return safeApiCall('qcServices.analyzeOneSupplier', async () => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const { data, error } = await apiClient.get<SupplierAnalysisResponse>(
      `/ai/supplier-analysis/${encodeURIComponent(supplierName)}`,
      {
        params: Object.keys(params).length > 0 ? params : undefined,
        // AI analysis may take longer than the default 30s API timeout.
        timeout: 90000,
      },
    );

    return requireData(data, error, 'Unable to analyze supplier');
  });
}
