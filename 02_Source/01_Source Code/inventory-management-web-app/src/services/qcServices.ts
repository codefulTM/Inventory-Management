import type {
  DashboardKPI,
  InventoryLot,
  PaginatedInventoryLots,
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

type RawInventoryLotsPayload =
  | RawInventoryLot[]
  | {
      data: RawInventoryLot[];
      total?: number;
      page?: number;
      limit?: number;
    };

interface GetInventoryLotsOptions {
  status?: string;
  page?: number;
  limit?: number;
}

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

function normalizeInventoryLotsPayload(
  payload: RawInventoryLotsPayload,
  fallbackPage: number,
  fallbackLimit: number,
): { data: RawInventoryLot[]; page: number; limit: number; total: number } {
  if (Array.isArray(payload)) {
    return {
      data: payload,
      page: fallbackPage,
      limit: fallbackLimit,
      total: payload.length,
    };
  }

  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    page: typeof payload.page === 'number' ? payload.page : fallbackPage,
    limit: typeof payload.limit === 'number' ? payload.limit : fallbackLimit,
    total:
      typeof payload.total === 'number'
        ? payload.total
        : Array.isArray(payload.data)
          ? payload.data.length
          : 0,
  };
}

async function buildMaterialNameMap(): Promise<Map<string, string>> {
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

  return materialNameById;
}

function enrichInventoryLots(
  lots: RawInventoryLot[],
  materialNameById: Map<string, string>,
): InventoryLot[] {
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
}

async function fetchInventoryLotsPage(
  options: GetInventoryLotsOptions,
  materialNameById: Map<string, string>,
): Promise<PaginatedInventoryLots> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;

  const params: Record<string, string | number> = { page, limit };
  if (options.status) {
    params.status = options.status;
  }

  const { data, error } = await apiClient.get<RawInventoryLotsPayload>(
    '/inventory-lots',
    { params },
  );

  const payload = requireData(data, error, 'Unable to fetch inventory lots');
  const normalized = normalizeInventoryLotsPayload(payload, page, limit);
  const normalizedLimit = Math.max(normalized.limit, 1);

  return {
    data: enrichInventoryLots(normalized.data, materialNameById),
    pagination: {
      page: normalized.page,
      limit: normalized.limit,
      total: normalized.total,
      totalPages: Math.max(1, Math.ceil(normalized.total / normalizedLimit)),
    },
  };
}

export async function getDashboardKPI(): Promise<DashboardKPI> {
  return safeApiCall('qcServices.getDashboardKPI', async () => {
    const { data, error } = await apiClient.get<DashboardKPI>('/qc-tests/dashboard');
    return requireData(data, error, 'Unable to fetch QC dashboard KPI');
  });
}

export async function getInventoryLotsPaginated(
  options: GetInventoryLotsOptions = {},
): Promise<PaginatedInventoryLots> {
  return safeApiCall('qcServices.getInventoryLotsPaginated', async () => {
    const materialNameById = await buildMaterialNameMap();
    return fetchInventoryLotsPage(options, materialNameById);
  });
}

export async function getInventoryLots(status?: string): Promise<InventoryLot[]> {
  return safeApiCall('qcServices.getInventoryLots', async () => {
    const materialNameById = await buildMaterialNameMap();
    const pageSize = 100;
    const firstPage = await fetchInventoryLotsPage(
      { status, page: 1, limit: pageSize },
      materialNameById,
    );

    if (firstPage.pagination.totalPages <= 1) {
      return firstPage.data;
    }

    const allLots = [...firstPage.data];
    for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
      const nextPage = await fetchInventoryLotsPage(
        { status, page, limit: pageSize },
        materialNameById,
      );
      allLots.push(...nextPage.data);
    }

    return allLots;
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
