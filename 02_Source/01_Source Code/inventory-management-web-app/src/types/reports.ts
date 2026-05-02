/** ==================== BÁO CÁO TỒN KHO ==================== */

/**
 * Một item trong báo cáo trạng thái tồn kho
 * Thể hiện số lượng và trạng thái của một lô hàng cụ thể
 */
export type InventoryStatusItem = {
  material_id: string;       // ID vật tư
  lot_id: string;            // ID lô hàng
  quantity: number;          // Số lượng tồn
  status: string;            // Trạng thái lô (Quarantine, Accepted, Rejected...)
  expiration_date?: string;  // Ngày hết hạn
};

/**
 * Báo cáo tổng quan trạng thái tồn kho
 * Hiển thị tất cả các lô hàng trong kho tại một thời điểm
 */
export type InventoryStatusReport = {
  generated_at: string;          // Thời điểm tạo báo cáo
  total_lots: number;            // Tổng số lô hàng
  items: InventoryStatusItem[];  // Chi tiết từng lô
};

/** ==================== BÁO CÁO SỬ DỤNG VẬT TƯ ==================== */

/**
 * Thống kê sử dụng một loại vật tư
 * Dùng để biết vật tư nào được dùng nhiều nhất
 */
export type MaterialUsageItem = {
  material_id: string;       // ID vật tư
  transaction_count: number; // Số lượng giao dịch (xuất kho)
  total_quantity: number;    // Tổng số lượng đã sử dụng
};

/**
 * Báo cáo sử dụng vật tư trong một khoảng thời gian
 * Giúp theo dõi xu hướng tiêu thụ vật tư
 */
export type MaterialUsageReport = {
  generated_at: string;          // Thời điểm tạo báo cáo
  from?: string;                  // Từ ngày
  to?: string;                    // Đến ngày
  items: MaterialUsageItem[];     // Chi tiết từng vật tư
};

/** ==================== BÁO CÁO HIỆU SUẤT QC ==================== */

/**
 * Hiệu suất của một nhà cung cấp dựa trên kết quả QC
 * Thống kê số lô đạt/không đạt từ nhà cung cấp
 */
export type QcPerformanceItem = {
  supplier_name: string;     // Tên nhà cung cấp
  approved: number;          // Số lô đạt chuẩn (Pass)
  rejected: number;          // Số lô không đạt (Fail)
  quality_rate: number;      // Tỷ lệ đạt (%)
};

/**
 * Báo cáo hiệu suất QC tổng hợp
 * Đánh giá chất lượng hàng hóa từ các nhà cung cấp
 */
export type QcPerformanceReport = {
  generated_at: string;          // Thời điểm tạo báo cáo
  items: QcPerformanceItem[];    // Chi tiết từng nhà cung cấp
};

/** ==================== BÁO CÁO KIỂM TOÁN ==================== */

/**
 * Một mục trong nhật ký kiểm toán
 * Ghi lại các hành động thay đổi dữ liệu trong hệ thống
 */
export type AuditEntry = {
  action: string;                     // Hành động (CREATE, UPDATE, DELETE...)
  entity: string;                     // Đối tượng bị tác động (Material, Lot...)
  performed_by: string;               // Người thực hiện
  performed_at: string;               // Thời điểm thực hiện
  details?: Record<string, unknown>;   // Chi tiết thay đổi
};

/**
 * Báo cáo kiểm toán (Audit Log)
 * Theo dõi lịch sử thay đổi dữ liệu hệ thống
 */
export type AuditReport = {
  generated_at: string;          // Thời điểm tạo báo cáo
  entries: AuditEntry[];         // Danh sách các hành động
};

/** ==================== BÁO CÁO XU HƯỚNG (TREND) ==================== */

/**
 * Khoảng thời gian trong báo cáo xu hướng
 * day: Theo ngày, week: Theo tuần, month: Theo tháng
 */
export type TrendInterval = 'day' | 'week' | 'month';

/**
 * Một điểm dữ liệu trong xu hướng tồn kho
 * Thể hiện số lượng tồn kho tại một thời điểm
 */
export type InventoryTrendPoint = {
  period: string;            // Kỳ báo cáo (2024-01, 2024-W01...)
  lot_count: number;        // Số lô hàng trong kỳ
  total_quantity: number;   // Tổng số lượng tồn
};

/**
 * Báo cáo xu hướng tồn kho theo thời gian
 * Giúp dự báo và quản lý mức tồn kho
 */
export type InventoryTrendReport = {
  generated_at: string;             // Thời điểm tạo báo cáo
  from: string;                     // Từ ngày
  to: string;                       // Đến ngày
  interval: TrendInterval;          // Khoảng thời gian
  points: InventoryTrendPoint[];    // Các điểm dữ liệu
};

/**
 * Một điểm dữ liệu trong xu hướng sử dụng vật tư
 * Theo dõi mức độ sử dụng của từng vật tư theo thời gian
 */
export type MaterialUsageTrendPoint = {
  period: string;            // Kỳ báo cáo
  material_id: string;       // ID vật tư
  transaction_count: number; // Số giao dịch trong kỳ
  total_quantity: number;    // Tổng số lượng sử dụng
};

/**
 * Báo cáo xu hướng sử dụng vật tư
 * Giúp lập kế hoạch mua hàng và sản xuất
 */
export type MaterialUsageTrendReport = {
  generated_at: string;                 // Thời điểm tạo báo cáo
  from: string;                         // Từ ngày
  to: string;                           // Đến ngày
  interval: TrendInterval;              // Khoảng thời gian
  points: MaterialUsageTrendPoint[];    // Các điểm dữ liệu
};

/**
 * Một điểm dữ liệu trong xu hướng QC
 * Thống kê số lượng Pass/Fail/Pending theo thời gian
 */
export type QcTrendPoint = {
  period: string;          // Kỳ báo cáo
  pass_count: number;     // Số lô đạt
  fail_count: number;     // Số lô không đạt
  pending_count: number;  // Số lô chờ kiểm tra
};

/**
 * Thứ hạng nhà cung cấp dựa trên chất lượng
 * Xếp hạng các nhà cung cấp có hàng chất lượng tốt nhất
 */
export type QcSupplierRankingItem = {
  supplier_name: string;   // Tên nhà cung cấp
  pass_count: number;      // Số lô đạt
  fail_count: number;      // Số lô không đạt
  quality_rate: number;    // Tỷ lệ đạt (%)
};

/**
 * Báo cáo xu hướng QC toàn diện
 * Kết hợp xu hướng theo thời gian và xếp hạng nhà cung cấp
 */
export type QcTrendReport = {
  generated_at: string;             // Thời điểm tạo báo cáo
  from: string;                     // Từ ngày
  to: string;                       // Đến ngày
  interval: TrendInterval;          // Khoảng thời gian
  points: QcTrendPoint[];           // Xu hướng theo thời gian
  supplier_rankings: QcSupplierRankingItem[]; // Xếp hạng NCC
};

/**
 * Một điểm dữ liệu trong xu hướng kiểm toán
 * Thống kê hoạt động hệ thống theo thời gian
 */
export type AuditTrendPoint = {
  period: string;          // Kỳ báo cáo
  activity_count: number;  // Số hoạt động trong kỳ
  unique_users: number;    // Số người dùng hoạt động
};

/**
 * Báo cáo xu hướng kiểm toán
 * Theo dõi mức độ hoạt động của hệ thống theo thời gian
 */
export type AuditTrendReport = {
  generated_at: string;          // Thời điểm tạo báo cáo
  from: string;                  // Từ ngày
  to: string;                    // Đến ngày
  interval: TrendInterval;       // Khoảng thời gian
  points: AuditTrendPoint[];     // Các điểm dữ liệu
};
