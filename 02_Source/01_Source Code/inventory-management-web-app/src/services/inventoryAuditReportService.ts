import { API_ENDPOINTS } from "../config/api.config";
import type {
  CreateInventoryAuditReportRequest,
  CreateInventoryAuditReportResponse,
  InventoryAuditReportItem,
  InventoryAuditReportListQuery,
  InventoryAuditReportListResponse,
} from "../types/inventoryAuditReport";
import { apiClient } from "./apiClient";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";

export class InventoryAuditReportApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "InventoryAuditReportApiError";
    this.statusCode = statusCode;
  }
}

function toApiError(
  error: { message?: string; statusCode?: number } | null | undefined,
  fallbackMessage: string,
): InventoryAuditReportApiError {
  return new InventoryAuditReportApiError(
    error?.message || fallbackMessage,
    error?.statusCode,
  );
}

function normalizeListResponse(
  data: InventoryAuditReportListResponse | null,
  query: InventoryAuditReportListQuery,
): InventoryAuditReportListResponse {
  const items = Array.isArray(data?.items) ? data.items : [];

  return {
    items,
    total: typeof data?.total === "number" ? data.total : items.length,
    page: typeof data?.page === "number" ? data.page : (query.page ?? 1),
    limit: typeof data?.limit === "number" ? data.limit : (query.limit ?? 10),
  };
}

export async function createInventoryAuditReport(
  payload: CreateInventoryAuditReportRequest,
): Promise<CreateInventoryAuditReportResponse> {
  const { data, error } =
    await apiClient.post<CreateInventoryAuditReportResponse>(
      API_ENDPOINTS.INVENTORY_AUDIT_REPORTS,
      payload,
    );

  if (error || !data) {
    throw toApiError(error, "Không thể tạo yêu cầu báo cáo kiểm kê.");
  }

  return data;
}

export async function fetchInventoryAuditReports(
  query: InventoryAuditReportListQuery = {},
): Promise<InventoryAuditReportListResponse> {
  const { data, error } = await apiClient.get<InventoryAuditReportListResponse>(
    API_ENDPOINTS.INVENTORY_AUDIT_REPORTS,
    {
      params: query,
    },
  );

  if (error) {
    throw toApiError(error, "Không thể tải danh sách báo cáo kiểm kê.");
  }

  return normalizeListResponse(data, query);
}

export async function fetchInventoryAuditReportDetail(
  reportId: string,
): Promise<InventoryAuditReportItem> {
  const { data, error } = await apiClient.get<InventoryAuditReportItem>(
    API_ENDPOINTS.INVENTORY_AUDIT_REPORT_DETAIL(reportId),
  );

  if (error || !data) {
    throw toApiError(error, "Không thể tải chi tiết báo cáo kiểm kê.");
  }

  return data;
}

export async function downloadInventoryAuditReport(reportId: string): Promise<{
  blob: Blob;
  fileName: string;
}> {
  const token = localStorage.getItem("auth_token");
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";
  const url = `${baseUrl}${API_ENDPOINTS.INVENTORY_AUDIT_REPORT_DOWNLOAD(reportId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let message = "Không thể tải báo cáo kiểm kê.";

    try {
      const payload = await response.json();
      message =
        typeof payload?.message === "string" &&
        payload.message.trim().length > 0
          ? payload.message
          : message;
    } catch {
      // Ignore JSON parse errors and fallback to default message.
    }

    throw new InventoryAuditReportApiError(message, response.status);
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const matchedFileName = disposition.match(/filename="?([^\\"]+)"?/i);

  return {
    blob: await response.blob(),
    fileName: matchedFileName?.[1] ?? `${reportId}.pdf`,
  };
}

export default {
  createInventoryAuditReport,
  fetchInventoryAuditReports,
  fetchInventoryAuditReportDetail,
  downloadInventoryAuditReport,
};
