// Loại trạng thái QC cũ (legacy) - vẫn giữ để tương thích ngược
export type QCStatus = 'pass' | 'fail' | 'pending';

// ── QCTest: Thông tin một bài kiểm tra chất lượng ──────────────────────────
/**
 * Thông tin một bài kiểm tra chất lượng (QC Test)
 * Mỗi lô hàng nhập về đều phải qua kiểm tra QC trước khi nhập kho
 */
export interface QCTest {
  test_id: string;           // Mã bài kiểm tra (do hệ thống sinh)
  lot_id: string;            // ID lô hàng được kiểm tra
  test_type: 'Identity' | 'Potency' | 'Microbial' | 'Growth Promotion' | 'Physical' | 'Chemical'; // Loại kiểm tra
  test_method: string;       // Phương pháp kiểm tra (tên quy trình)
  test_date: string;         // Ngày thực hiện kiểm tra
  test_result: string;       // Kết quả kiểm tra (thường là số liệu)
  acceptance_criteria?: string; // Tiêu chí chấp nhận (ngưỡng đạt)
  result_status: 'Pass' | 'Fail' | 'Pending'; // Trạng thái kết quả
  performed_by: string;      // ID người thực hiện
  verified_by?: string;      // ID người xác nhận
  approved_by?: string;      // ID người phê duyệt
  reject_reason?: string;    // Lý do từ chối (nếu Fail)
  label_id?: string;         // ID nhãn mác liên quan
  created_date: string;      // Ngày tạo bản ghi
  modified_date: string;     // Ngày cập nhật
  history?: Record<string, any>[]; // Lịch sử thay đổi (audit trail)
}

// ── InventoryLot: Thông tin lô hàng trong kho ─────────────────────────────
/**
 * Thông tin tóm tắt lô hàng dùng cho màn hình QC
 * Chứa thông tin cần thiết để quyết định chấp nhận/từ chối lô
 */
export interface InventoryLot {
  lot_id: string;            // Mã lô hàng
  material_name: string;     // Tên vật tư
  supplier_name: string;     // Tên nhà cung cấp
  quantity: number;          // Số lượng hiện tại
  unit?: string;             // Đơn vị tính
  storage_location?: string; // Vị trí lưu kho
  expiration_date?: string;  // Ngày hết hạn
  status: 'Quarantine' | 'Accepted' | 'Rejected' | 'Depleted' | 'Hold'; // Trạng thái lô
  created_date?: string;     // Ngày tạo
  modified_date?: string;    // Ngày cập nhật
  unit_of_measure?: string;  // Đơn vị đo lường chuẩn
  location?: string;         // Vị trí (alias)
}

/**
 * Thông tin phân trang cơ bản
 * Dùng chung cho nhiều API trả về danh sách
 */
export interface PaginationMeta {
  page: number;              // Trang hiện tại
  limit: number;             // Số items mỗi trang
  total: number;             // Tổng số items
  totalPages: number;        // Tổng số trang
}

/**
 * Response danh sách lô hàng có phân trang
 */
export interface PaginatedInventoryLots {
  data: InventoryLot[];      // Danh sách lô hàng
  pagination: PaginationMeta; // Thông tin phân trang
}

// ── KPI / Reporting: Các chỉ số hiệu suất ────────────────────────────────
/**
 * Các chỉ số KPI hiển thị trên Dashboard QC
 * Theo dõi hiệu suất kiểm tra chất lượng
 */
export interface DashboardKPI {
  pending_count: number;     // Số lô đang chờ kiểm tra
  approved_count: number;    // Số lô đã đạt
  rejected_count: number;    // Số lô không đạt
  error_rate: number;        // Tỷ lệ lỗi (%)
}

/**
 * Hiệu suất của nhà cung cấp dựa trên kết quả QC
 * Đánh giá độ tin cậy của từng nhà cung cấp
 */
export interface SupplierPerformance {
  supplier_name: string;     // Tên nhà cung cấp
  total_batches: number;     // Tổng số lô đã giao
  approved: number;          // Số lô đạt chuẩn
  rejected: number;          // Số lô bị từ chối
  quality_rate: number;      // Tỷ lệ đạt (%)
}

// ── DTOs: Dữ liệu truyền tải cho API ──────────────────────────────────────
/**
 * Dữ liệu tạo mới một bài kiểm tra QC
 * Gửi lên API POST /qc-tests
 */
export interface CreateQCTestDto {
  lot_id: string;                              // ID lô hàng
  test_type: QCTest['test_type'];               // Loại kiểm tra
  test_method: string;                         // Phương pháp
  test_date: string;                           // Ngày kiểm tra
  test_result: string;                         // Kết quả
  acceptance_criteria?: string;                // Tiêu chí đạt
  result_status: QCTest['result_status'];      // Trạng thái
  performed_by: string;                        // Người thực hiện
  verified_by?: string;                        // Người xác nhận
  reject_reason?: string;                      // Lý do từ chối
  label_id?: string;                           // ID nhãn
}

/**
 * Dữ liệu quyết định cho một lô hàng
 * Dùng để chấp nhận/từ chối lô sau khi kiểm tra
 */
export interface LotDecisionDto {
  decision: 'Accepted' | 'Rejected' | 'Hold'; // Quyết định
  verified_by: string;                          // Người xác nhận
  reject_reason?: string;                       // Lý do (nếu từ chối)
  label_id?: string;                            // ID nhãn (nếu đạt)
}

/**
 * Dữ liệu cho hành động kiểm tra lại (Retest)
 * Gia hạn hoặc hủy bỏ lô hàng
 */
export interface RetestDto {
  action: 'extend' | 'discard';  // Hành động: gia hạn hoặc hủy
  performed_by: string;           // Người thực hiện
  new_expiry_date?: string;       // Ngày hết hạn mới (nếu gia hạn)
}

// ── AI Supplier Analysis: Phân tích NCC bằng AI ──────────────────────────
/**
 * Kết quả phân tích nhà cung cấp bởi AI Agent
 * Sử dụng HuggingFace LLM để đánh giá chất lượng NCC
 */
export interface SupplierAnalysisResponse {
  success: boolean;             // Trạng thái thành công
  analysis: string;             // Nội dung phân tích bằng tiếng Việt
  suppliers_analyzed: number;   // Số nhà cung cấp được phân tích
  timestamp: string;            // Thời điểm phân tích
  model_used: string;           // Tên model AI đã dùng
}