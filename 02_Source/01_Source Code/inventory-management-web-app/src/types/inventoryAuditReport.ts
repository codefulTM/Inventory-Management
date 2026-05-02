/**
 * Trạng thái báo cáo kiểm kê tồn kho
 * PENDING: Chờ xử lý (mới tạo)
 * PROCESSING: Đang xử lý (tính toán số liệu)
 * READY: Sẵn sàng tải về (đã có file PDF)
 * FAILED: Thất bại (lỗi khi tạo báo cáo)
 */
export type InventoryAuditReportStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY"
  | "FAILED";

/**
 * Danh sách trạng thái báo cáo (dùng cho dropdown)
 */
export const INVENTORY_AUDIT_REPORT_STATUSES: InventoryAuditReportStatus[] = [
  "PENDING",
  "PROCESSING",
  "READY",
  "FAILED",
];

/**
 * Nhãn tiếng Việt cho các trạng thái báo cáo
 * Dùng để hiển thị trên giao diện người dùng
 */
export const INVENTORY_AUDIT_REPORT_STATUS_LABELS: Record<
  InventoryAuditReportStatus,
  string
> = {
  PENDING: "Chờ xử lý",
  PROCESSING: "Đang xử lý",
  READY: "Sẵn sàng tải",
  FAILED: "Thất bại",
};

/**
 * Dữ liệu tạo mới báo cáo kiểm kê
 * Gửi lên API POST /inventory-audit-reports
 */
export interface CreateInventoryAuditReportRequest {
  period_from: string;                // Từ ngày (kỳ kiểm kê)
  period_to: string;                  // Đến ngày
  scope_warehouse_ids?: string[];     // Giới hạn trong các kho (null = tất cả)
  include_zero_balance?: boolean;     // Có bao gồm lô có số lượng = 0
  report_template_code?: string;      // Mã mẫu báo cáo
  signer_profile_id?: string;         // ID người ký báo cáo
  note?: string;                     // Ghi chú
  approved_by?: string;              // ID người phê duyệt
}

/**
 * Kết quả khi tạo yêu cầu báo cáo
 * Trả về từ API POST /inventory-audit-reports
 */
export interface CreateInventoryAuditReportResponse {
  report_id: string;                  // ID báo cáo vừa tạo
  status: InventoryAuditReportStatus; // Trạng thái ban đầu (thường là PENDING)
  requested_by: string;               // ID người yêu cầu
  requested_at: string;              // Thời điểm yêu cầu
  failure_reason?: string;           // Lý do thất bại (nếu có)
}

/**
 * Thông tin chi tiết một báo cáo kiểm kê
 * Chứa đầy đủ thông tin và đường dẫn file PDF
 */
export interface InventoryAuditReportItem {
  report_id: string;                  // ID báo cáo
  period_from?: string;               // Kỳ từ ngày
  period_to?: string;                 // Kỳ đến ngày
  scope_warehouse_ids?: string[];     // Các kho trong phạm vi
  report_template_code?: string;       // Mã mẫu
  status: InventoryAuditReportStatus; // Trạng thái
  summary_total_items?: number;       // Tổng số items (lô)
  summary_total_quantity?: number;    // Tổng số lượng
  summary_total_value?: number;       // Tổng giá trị tồn kho
  file_storage_key?: string;          // Key lưu trữ file PDF
  file_sha256?: string;              // Mã băm SHA256 của file
  file_size_bytes?: number;           // Kích thước file (byte)
  pdf_version?: string;               // Phiên bản PDF
  signed_at?: string;                // Thời điểm ký điện tử
  signature_provider?: string;        // Nhà cung cấp chữ ký số
  signature_serial_number?: string;   // Số serial chứng thư
  signature_valid_from?: string;     // Chữ ký có hiệu lực từ
  signature_valid_to?: string;       // Chữ ký hết hạn
  requested_by: string;               // Người yêu cầu
  approved_by?: string;               // Người phê duyệt
  note?: string;                     // Ghi chú
  failure_reason?: string;           // Lý do thất bại
  created_date?: string;             // Ngày tạo
  modified_date?: string;            // Ngày cập nhật
}

/**
 * Tham số truy vấn danh sách báo cáo kiểm kê
 */
export interface InventoryAuditReportListQuery {
  page?: number;                          // Trang
  limit?: number;                         // Số items/trang
  status?: InventoryAuditReportStatus;     // Lọc theo trạng thái
  requested_by?: string;                  // Lọc theo người yêu cầu
  from?: string;                          // Từ ngày tạo
  to?: string;                            // Đến ngày tạo
}

/**
 * Response danh sách báo cáo kiểm kê có phân trang
 */
export interface InventoryAuditReportListResponse {
  items: InventoryAuditReportItem[];  // Danh sách báo cáo
  total: number;                      // Tổng số báo cáo
  page: number;                       // Trang hiện tại
  limit: number;                      // Số items/trang
}
