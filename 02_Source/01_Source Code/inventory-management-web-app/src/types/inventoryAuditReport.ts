export type InventoryAuditReportStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY"
  | "FAILED";

export const INVENTORY_AUDIT_REPORT_STATUSES: InventoryAuditReportStatus[] = [
  "PENDING",
  "PROCESSING",
  "READY",
  "FAILED",
];

export const INVENTORY_AUDIT_REPORT_STATUS_LABELS: Record<
  InventoryAuditReportStatus,
  string
> = {
  PENDING: "Chờ xử lý",
  PROCESSING: "Đang xử lý",
  READY: "Sẵn sàng tải",
  FAILED: "Thất bại",
};

export interface CreateInventoryAuditReportRequest {
  period_from: string;
  period_to: string;
  scope_warehouse_ids?: string[];
  include_zero_balance?: boolean;
  report_template_code?: string;
  signer_profile_id?: string;
  note?: string;
  approved_by?: string;
}

export interface CreateInventoryAuditReportResponse {
  report_id: string;
  status: InventoryAuditReportStatus;
  requested_by: string;
  requested_at: string;
  failure_reason?: string;
}

export interface InventoryAuditReportItem {
  report_id: string;
  period_from?: string;
  period_to?: string;
  scope_warehouse_ids?: string[];
  report_template_code?: string;
  status: InventoryAuditReportStatus;
  summary_total_items?: number;
  summary_total_quantity?: number;
  summary_total_value?: number;
  file_storage_key?: string;
  file_sha256?: string;
  file_size_bytes?: number;
  pdf_version?: string;
  signed_at?: string;
  signature_provider?: string;
  signature_serial_number?: string;
  signature_valid_from?: string;
  signature_valid_to?: string;
  requested_by: string;
  approved_by?: string;
  note?: string;
  failure_reason?: string;
  created_date?: string;
  modified_date?: string;
}

export interface InventoryAuditReportListQuery {
  page?: number;
  limit?: number;
  status?: InventoryAuditReportStatus;
  requested_by?: string;
  from?: string;
  to?: string;
}

export interface InventoryAuditReportListResponse {
  items: InventoryAuditReportItem[];
  total: number;
  page: number;
  limit: number;
}
