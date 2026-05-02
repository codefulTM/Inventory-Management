/**
 * Trạng thái lô sản xuất (Production Batch)
 * In Progress: Đang sản xuất
 * Complete: Đã hoàn thành
 * On Hold: Tạm dừng
 * Cancelled: Đã hủy
 */
export type BatchStatus = "In Progress" | "Complete" | "On Hold" | "Cancelled";

/**
 * Danh sách trạng thái lô sản xuất (dùng cho dropdown)
 */
export const BATCH_STATUS_LIST: BatchStatus[] = [
  "In Progress",
  "Complete",
  "On Hold",
  "Cancelled",
];

/**
 * Thông tin lô sản xuất
 * Đại diện cho một lô thành phẩm được sản xuất từ các nguyên liệu
 */
export interface ProductionBatch {
  _id: string;                      // ID MongoDB
  batch_id: string;                  // Mã lô sản xuất (do hệ thống sinh)
  product_id: string;                // ID sản phẩm được sản xuất
  batch_number: string;              // Số lô (hiển thị cho người dùng)
  unit_of_measure: string;           // Đơn vị tính
  manufacture_date: string;          // Ngày sản xuất
  expiration_date: string;           // Ngày hết hạn
  status: BatchStatus;               // Trạng thái lô
  batch_size: string;                // Kích thước lô (Decimal128 dạng chuỗi)
  created_date: string;              // Ngày tạo
  modified_date: string;             // Ngày cập nhật
  created_by?: string;               // Người tạo
  approved_by?: string;              // Người phê duyệt
  completed_by?: string;             // Người hoàn thành
  shelf_life_value?: number;         // Thời gian sử dụng (số)
  shelf_life_unit?: string;          // Đơn vị thời gian (day, month, year)
}

/**
 * Thông tin thành phần (nguyên liệu) trong lô sản xuất
 * Mỗi lô sản xuất bao gồm nhiều thành phần từ các lô nguyên liệu khác nhau
 */
export interface BatchComponent {
  _id: string;                    // ID MongoDB
  component_id?: string;            // Mã thành phần (tự động sinh)
  batch_id?: string;               // ID lô sản xuất cha
  lot_id: string;                  // ID lô nguyên liệu được sử dụng
  planned_quantity: string;        // Số lượng kế hoạch (Decimal128)
  actual_quantity?: string;        // Số lượng thực tế đã dùng
  unit_of_measure: string;         // Đơn vị tính
  addition_date?: string;          // Ngày thêm vào sản xuất
  added_by?: string;               // Người thêm
  created_date: string;            // Ngày tạo
  modified_date: string;           // Ngày cập nhật
}

/**
 * Response phân trang cho danh sách lô sản xuất
 */
export interface PaginatedProductionBatch {
  data: ProductionBatch[];       // Danh sách lô trong trang hiện tại
  pagination: {
    page: number;               // Trang hiện tại
    limit: number;              // Số items mỗi trang
    total: number;              // Tổng số lô
    totalPages: number;         // Tổng số trang
  };
}
