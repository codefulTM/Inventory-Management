/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Trạng thái lô hàng (Lot Status)
 * Pending: Chờ xử lý
 * Received: Đã nhận (mới nhập)
 * QC_Pending: Chờ kiểm tra chất lượng
 * QC_Passed: Đã qua QC (đạt)
 * QC_Failed: Không đạt QC
 * In_Use: Đang được sử dụng
 * Consumed: Đã tiêu thụ hết
 * Disposed: Đã hủy bỏ
 * Quarantine: Cách ly (chờ quyết định)
 * Accepted: Đã chấp nhận nhập kho
 * Rejected: Bị từ chối (trả NCC)
 * Depleted: Đã cạn kiệt
 * Hold: Tạm giữ (chờ xử lý)
 */
export type LotStatus =
  | "Pending"
  | "Received"
  | "QC_Pending"
  | "QC_Passed"
  | "QC_Failed"
  | "In_Use"
  | "Consumed"
  | "Disposed"
  | "Quarantine"
  | "Accepted"
  | "Rejected"
  | "Depleted"
  | "Hold";

/**
 * Thông tin lô hàng trong kho (Inventory Lot)
 * Đại diện cho một lô cụ thể của một loại vật tư
 */
export interface InventoryLot {
  _id: string;                          // ID MongoDB
  lot_id: string;                        // Mã lô hàng (duy nhất)
  material_id: string;                   // ID vật tư
  manufacturer_name: string;             // Tên nhà sản xuất
  manufacturer_lot: string;             // Số lô của nhà sản xuất
  supplier_name?: string;                // Tên nhà cung cấp
  received_date: string;                 // Ngày nhập kho
  expiration_date: string;              // Ngày hết hạn
  in_use_expiration_date?: string;      // Ngày hết hạn khi đang sử dụng
  status: LotStatus;                    // Trạng thái lô
  quantity: number;                     // Số lượng hiện tại
  unit_of_measure: string;              // Đơn vị tính
  storage_location?: string;            // Vị trí lưu kho
  is_sample: boolean;                   // Có phải lô mẫu không
  parent_lot_id?: string;               // ID lô cha (nếu là lô tách)
  notes?: string;                       // Ghi chú
  created_date: string;                 // Ngày tạo
  modified_date: string;                // Ngày cập nhật
  received_by?: string;                  // Người nhận hàng
  qc_by?: string;                       // Người kiểm tra QC
  history?: Record<string, any>[];      // Lịch sử thay đổi
}

/**
 * Loại giao dịch kho (trùng với InventoryTransactionType)
 */
export type TransactionType =
  | "Receipt"
  | "Usage"
  | "Split"
  | "Adjustment"
  | "Transfer"
  | "Disposal";

/**
 * Thông tin giao dịch kho (đầy đủ)
 * Khác với InventoryTransaction ở types/inventoryTransaction.ts
 */
export interface InventoryTransaction {
  _id: string;                          // ID MongoDB
  transaction_id: string;                // Mã giao dịch
  lot_id: string;                        // ID lô hàng
  related_lot_id?: string;               // ID lô liên quan (khi tách lô)
  transaction_type: TransactionType;     // Loại giao dịch
  quantity: number;                     // Số lượng
  unit_of_measure: string;              // Đơn vị tính
  transaction_date: string;             // Ngày giao dịch
  reference_number?: string;            // Số tham chiếu
  performed_by: string;                  // Người thực hiện
  notes?: string;                       // Ghi chú
}
