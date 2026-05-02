/**
 * Loại giao dịch kho (Inventory Transaction)
 * Receipt: Nhập kho (từ nhà cung cấp)
 * Usage: Xuất kho sử dụng (cho sản xuất)
 * Split: Tách lô (chia lô lớn thành lô nhỏ)
 * Adjustment: Điều chỉnh số lượng (do kiểm kê)
 * Transfer: Chuyển kho (giữa các kho)
 * Disposal: Hủy bỏ (hàng hỏng, hết hạn)
 */
export type InventoryTransactionType =
  | "Receipt"
  | "Usage"
  | "Split"
  | "Adjustment"
  | "Transfer"
  | "Disposal";

/**
 * Thông tin một giao dịch kho
 * Mỗi khi có thay đổi số lượng tồn kho đều sinh ra giao dịch này
 */
export interface InventoryTransaction {
  _id?: string;                              // ID MongoDB
  transaction_id?: string;                    // Mã giao dịch
  lot_id: string;                             // ID lô hàng bị tác động
  transaction_type: InventoryTransactionType | string; // Loại giao dịch
  quantity: number;                           // Số lượng giao dịch (có thể âm)
  unit_of_measure: string;                    // Đơn vị tính
  transaction_date: string;                   // Ngày giao dịch
  reference_number?: string;                  // Số tham chiếu (phiếu, đơn...)
  performed_by: string;                       // ID người thực hiện
  notes?: string;                            // Ghi chú
  material_id?: string;                       // ID vật tư (denormalized)
  created_date?: string;                      // Ngày tạo
  modified_date?: string;                     // Ngày cập nhật
  [key: string]: any;                        // Cho phép thêm field linh hoạt
}

/**
 * Tham số truy vấn lịch sử giao dịch cá nhân
 * Dùng cho màn hình "Lịch sử của tôi"
 */
export interface MyHistoryQuery {
  page?: number;                              // Trang
  limit?: number;                             // Số items/trang
  from?: string | Date;                       // Từ ngày
  to?: string | Date;                         // Đến ngày
  transaction_type?: InventoryTransactionType; // Lọc theo loại giao dịch
  keyword?: string;                           // Từ khóa tìm kiếm
}

/**
 * Một item trong lịch sử giao dịch (có đầy đủ transaction_id)
 */
export interface MyHistoryItem extends InventoryTransaction {
  transaction_id: string;  // Bắt buộc phải có mã giao dịch
}

/**
 * Response danh sách lịch sử giao dịch
 */
export interface MyHistoryListResponse {
  items: MyHistoryItem[];  // Danh sách giao dịch
  total: number;           // Tổng số giao dịch
}
