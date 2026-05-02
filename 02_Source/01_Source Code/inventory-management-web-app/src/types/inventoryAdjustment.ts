/**
 * Mã lý do điều chỉnh tồn kho
 * DAMAGED: Hàng hỏng (hư hại trong kho)
 * LOST: Mất mát (thất thoát không rõ nguyên nhân)
 * EXPIRED: Hết hạn sử dụng
 * COUNT_CORRECTION: Điều chỉnh sau kiểm kê (thừa/thiếu)
 * SYSTEM_CORRECTION: Điều chỉnh do lỗi hệ thống
 * OTHER: Lý do khác
 */
export type InventoryAdjustmentReasonCode =
  | "DAMAGED"
  | "LOST"
  | "EXPIRED"
  | "COUNT_CORRECTION"
  | "SYSTEM_CORRECTION"
  | "OTHER";

/**
 * Danh sách mã lý do (dùng cho dropdown)
 */
export const INVENTORY_ADJUSTMENT_REASON_CODES: InventoryAdjustmentReasonCode[] =
  [
    "DAMAGED",
    "LOST",
    "EXPIRED",
    "COUNT_CORRECTION",
    "SYSTEM_CORRECTION",
    "OTHER",
  ];

/**
 * Nhãn tiếng Việt cho các mã lý do
 * Hiển thị trên giao diện người dùng
 */
export const INVENTORY_ADJUSTMENT_REASON_LABELS: Record<
  InventoryAdjustmentReasonCode,
  string
> = {
  DAMAGED: "Hàng hỏng",
  LOST: "Mất mát",
  EXPIRED: "Hết hạn",
  COUNT_CORRECTION: "Điều chỉnh kiểm kê",
  SYSTEM_CORRECTION: "Điều chỉnh hệ thống",
  OTHER: "Khác",
};

/**
 * Dữ liệu tạo phiếu điều chỉnh tồn kho
 * Gửi lên API POST /inventory-adjustments
 */
export interface CreateInventoryAdjustmentRequest {
  lot_id: string;                             // ID lô hàng cần điều chỉnh
  adjustment_quantity: number;               // Số lượng điều chỉnh (âm hoặc dương)
  reason_code: InventoryAdjustmentReasonCode; // Mã lý do
  reason_note?: string;                       // Ghi chú chi tiết
  unit_cost_snapshot: number;                 // Đơn giá tại thời điểm điều chỉnh
}

/**
 * Snapshot (ảnh chụp) thông tin lô hàng
 * Dùng để so sánh trước và sau điều chỉnh
 */
export interface InventoryAdjustmentLotSnapshot {
  lot_id: string;            // ID lô hàng
  quantity: number;         // Số lượng tại thời điểm chụp
  unit_of_measure: string;  // Đơn vị tính
}

/**
 * Kết quả tạo phiếu điều chỉnh
 * Trả về từ API POST /inventory-adjustments
 */
export interface CreateInventoryAdjustmentResponse {
  adjustment_id: string;                        // ID phiếu điều chỉnh
  lot_before: InventoryAdjustmentLotSnapshot;   // Lô trước điều chỉnh
  lot_after: InventoryAdjustmentLotSnapshot;    // Lô sau điều chỉnh
  transaction_id: string;                       // ID giao dịch kho tương ứng
  valuation_before: number;                    // Giá trị tồn trước
  valuation_after: number;                     // Giá trị tồn sau
  valuation_delta: number;                     // Thay đổi giá trị
  material_id: string;                         // ID vật tư
  reason_code: InventoryAdjustmentReasonCode;  // Mã lý do
  reason_note?: string;                        // Ghi chú
  performed_by: string;                        // Người thực hiện
  created_date?: string;                       // Ngày tạo
}

/**
 * Thông tin một phiếu điều chỉnh tồn kho
 * Đại diện cho một lần thay đổi số lượng có chủ đích
 */
export interface InventoryAdjustmentItem {
  adjustment_id: string;                        // ID phiếu điều chỉnh
  lot_id: string;                              // ID lô hàng
  material_id: string;                         // ID vật tư
  adjustment_quantity: number;                 // Số lượng điều chỉnh
  quantity_before: number;                      // Số lượng trước
  quantity_after: number;                      // Số lượng sau
  reason_code: InventoryAdjustmentReasonCode;  // Mã lý do
  reason_note?: string;                        // Ghi chú
  unit_cost_snapshot: number;                  // Đơn giá lúc điều chỉnh
  valuation_before: number;                    // Giá trị trước
  valuation_after: number;                     // Giá trị sau
  valuation_delta: number;                     // Chênh lệch giá trị
  performed_by: string;                        // Người thực hiện
  approved_by?: string;                        // Người phê duyệt
  linked_transaction_id: string;               // ID giao dịch liên kết
  created_date?: string;                       // Ngày tạo
  modified_date?: string;                      // Ngày cập nhật
}

/**
 * Tham số truy vấn danh sách phiếu điều chỉnh
 */
export interface InventoryAdjustmentListQuery {
  page?: number;                                // Trang
  limit?: number;                               // Số items/trang
  lot_id?: string;                              // Lọc theo lô
  material_id?: string;                         // Lọc theo vật tư
  performed_by?: string;                        // Lọc theo người thực hiện
  reason_code?: InventoryAdjustmentReasonCode;  // Lọc theo lý do
  from?: string;                                // Từ ngày
  to?: string;                                  // Đến ngày
}

/**
 * Response danh sách phiếu điều chỉnh có phân trang
 */
export interface InventoryAdjustmentListResponse {
  items: InventoryAdjustmentItem[];  // Danh sách phiếu
  total: number;                     // Tổng số phiếu
  page: number;                      // Trang hiện tại
  limit: number;                     // Số items/trang
}
