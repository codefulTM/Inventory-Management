/**
 * QC Services
 * Service xử lý các tác vụ Quality Control:
 * - Dashboard KPI: thống kê lô chờ, đạt, từ chối, tỷ lệ lỗi
 * - Inventory Lots: danh sách lô hàng (phân trang, lọc theo trạng thái)
 * - QC Tests: tạo, cập nhật, xóa bài kiểm tra chất lượng
 * - Lot Decision: quyết định approve/reject lô hàng
 * - Supplier Performance: phân tích hiệu suất nhà cung cấp
 * - AI Supplier Analysis: phân tích nhà cung cấp bằng AI
 */

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

/**
 * Type RawInventoryLot - Dữ liệu lô hàng thô từ API
 * material_name có thể nằm trực tiếp hoặc trong object material
 */
type RawInventoryLot = Omit<InventoryLot, 'material_name'> & {
  material_name?: string;
  material_id?: string;
  material?: {
    material_id?: string;
    material_name?: string;
  };
};

/**
 * Type RawInventoryLotsPayload - Response API có thể là array hoặc object có pagination
 */
type RawInventoryLotsPayload =
  | RawInventoryLot[]
  | {
      data: RawInventoryLot[];
      total?: number;
      page?: number;
      limit?: number;
    };

/**
 * Options khi gọi API lấy danh sách lô hàng
 */
interface GetInventoryLotsOptions {
  status?: string;  // Lọc theo trạng thái
  page?: number;
  limit?: number;
}

/**
 * Helper: unwrap data hoặc throw error
 */
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

/**
 * Chuẩn hóa payload lô hàng: xử lý cả trường hợp array hoặc object có pagination
 * @param payload - Dữ liệu thô từ API
 * @param fallbackPage - Trang mặc định nếu không có
 * @param fallbackLimit - Limit mặc định nếu không có
 */
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

/**
 * Xây dựng map material_id -> material_name
 * Dùng để enrich dữ liệu lô hàng với tên nguyên liệu
 */
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
    // Không block việc lấy danh sách lô nếu không load được catalog nguyên liệu
  }

  return materialNameById;
}

/**
 * Enrich lô hàng với material_name đã giải quyết
 * Ưu tiên: material_name trực tiếp > material.material_name > lookup từ map
 */
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

/**
 * Lấy 1 trang danh sách lô hàng với phân trang
 */
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

// ===== PUBLIC API =====

/**
 * Lấy KPI dashboard QC: pending, approved, rejected, error_rate
 */
export async function getDashboardKPI(): Promise<DashboardKPI> {
  return safeApiCall('qcServices.getDashboardKPI', async () => {
    const { data, error } = await apiClient.get<DashboardKPI>('/qc-tests/dashboard');
    return requireData(data, error, 'Unable to fetch QC dashboard KPI');
  });
}

/**
 * Lấy danh sách lô hàng phân trang (có filter theo status)
 */
export async function getInventoryLotsPaginated(
  options: GetInventoryLotsOptions = {},
): Promise<PaginatedInventoryLots> {
  return safeApiCall('qcServices.getInventoryLotsPaginated', async () => {
    const materialNameById = await buildMaterialNameMap();
    return fetchInventoryLotsPage(options, materialNameById);
  });
}

/**
 * Lấy TẤT CẢ lô hàng (tự động fetch nhiều trang nếu cần)
 * @param status - Lọc theo trạng thái (optional)
 */
export async function getInventoryLots(status?: string): Promise<InventoryLot[]> {
  return safeApiCall('qcServices.getInventoryLots', async () => {
    const materialNameById = await buildMaterialNameMap();
    const pageSize = 100;
    const firstPage = await fetchInventoryLotsPage(
      { status, page: 1, limit: pageSize },
      materialNameById,
    );

    // Nếu chỉ có 1 trang, trả về luôn
    if (firstPage.pagination.totalPages <= 1) {
      return firstPage.data;
    }

    // Fetch các trang còn lại
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

/**
 * Lấy danh sách QC tests của một lô hàng cụ thể
 */
export async function getQCTestsByLot(lot_id: string): Promise<QCTest[]> {
  return safeApiCall('qcServices.getQCTestsByLot', async () => {
    const { data, error } = await apiClient.get<QCTest[]>(
      `/qc-tests/lot/${encodeURIComponent(lot_id)}`,
    );

    return requireData(data, error, 'Unable to fetch QC tests for lot');
  });
}

/**
 * Lấy tất cả QC tests
 */
export async function getAllQCTests(): Promise<QCTest[]> {
  return safeApiCall('qcServices.getAllQCTests', async () => {
    const { data, error } = await apiClient.get<QCTest[]>('/qc-tests');
    return requireData(data, error, 'Unable to fetch QC tests');
  });
}

/**
 * Tạo bài kiểm tra QC mới
 */
export async function createQCTest(payload: CreateQCTestDto): Promise<QCTest> {
  return safeApiCall('qcServices.createQCTest', async () => {
    const { data, error } = await apiClient.post<QCTest>('/qc-tests', payload);
    return requireData(data, error, 'Unable to create QC test');
  });
}

/**
 * Cập nhật bài kiểm tra QC
 */
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

/**
 * Xóa bài kiểm tra QC
 */
export async function deleteQCTest(test_id: string): Promise<void> {
  return safeApiCall('qcServices.deleteQCTest', async () => {
    const { error } = await apiClient.delete(`/qc-tests/${encodeURIComponent(test_id)}`);
    if (error) {
      throw new Error(error.message ?? 'Unable to delete QC test');
    }
  });
}

/**
 * Gửi quyết định cho lô hàng (approve/reject)
 */
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

/**
 * Gửi yêu cầu kiểm tra lại (retest) cho lô hàng
 */
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

/**
 * Đưa nhiều lô hàng vào trạng thái quarantine
 */
export async function bulkQuarantine(lot_ids: string[]): Promise<{ updated: number }> {
  return safeApiCall('qcServices.bulkQuarantine', async () => {
    const { data, error } = await apiClient.post<{ updated: number }>(
      '/inventory-lots/bulk-quarantine',
      { lot_ids },
    );

    return requireData(data, error, 'Unable to quarantine lots');
  });
}

/**
 * Lấy hiệu suất nhà cung cấp (số lô đạt, không đạt, tỷ lệ)
 * @param from - Ngày bắt đầu
 * @param to - Ngày kết thúc
 */
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

/**
 * Phân tích TẤT CẢ nhà cung cấp bằng AI
 * Timeout: 90s (lâu hơn default vì AI cần thời gian xử lý)
 */
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

/**
 * Phân tích MỘT nhà cung cấp cụ thể bằng AI
 */
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
