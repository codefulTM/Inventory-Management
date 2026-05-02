/**
 * Loại phiếu nhập/xuất kho
 * IN: Phiếu nhập kho (nhập vật tư vào kho)
 * OUT: Phiếu xuất kho (xuất vật tư khỏi kho)
 */
export type WarehouseSlipType = "IN" | "OUT";

/**
 * Trạng thái phiếu nhập/xuất kho
 * PENDING: Chờ xác nhận
 * CONFIRMED: Đã xác nhận
 * REJECTED: Đã từ chối
 */
export type WarehouseSlipStatus = "PENDING" | "CONFIRMED" | "REJECTED";

/**
 * Chi tiết một dòng trong phiếu nhập/xuất kho
 * Mỗi dòng đại diện cho một loại vật tư/lô hàng cụ thể
 */
export interface WarehouseSlipLine {
  line_id: string;           // ID duy nhất của dòng
  material_id?: string;      // ID vật tư
  sku?: string;              // Mã SKU (Stock Keeping Unit)
  lot_id?: string;           // ID lô hàng
  quantity: number;          // Số lượng
  unit?: string;             // Đơn vị tính
  unit_price?: number;       // Đơn giá
  expiry_date?: string;      // Ngày hết hạn
  notes?: string;            // Ghi chú
}

/**
 * Thông tin tệp đính kèm trong phiếu nhập/xuất kho
 * Dùng để lưu chứng từ, hóa đơn, ảnh xác nhận...
 */
export interface WarehouseSlipAttachment {
  file_id: string;           // ID tệp trong hệ thống
  original_name: string;     // Tên gốc của tệp
  mime_type: string;         // Loại MIME (image/png, application/pdf...)
  size_bytes: number;        // Kích thước tệp (byte)
  url: string;               // Đường dẫn truy cập tệp
  storage_source?: string;   // Nguồn lưu trữ (local, S3, etc.)
  uploaded_by?: string;      // ID người tải lên
  uploaded_at?: string;      // Thời điểm tải lên
}

/**
 * Thông tin phiếu nhập/xuất kho
 * Đại diện cho một giao dịch nhập hoặc xuất kho hoàn chỉnh
 */
export interface WarehouseSlip {
  _id?: string;                      // ID MongoDB (tự động sinh)
  slip_id: string;                   // Mã phiếu (do hệ thống sinh)
  slip_number: string;               // Số phiếu hiển thị
  type: WarehouseSlipType;          // Loại phiếu: IN hoặc OUT
  warehouse_id: string;              // ID kho thực hiện
  status: WarehouseSlipStatus;       // Trạng thái phiếu
  reference_number?: string;         // Số tham chiếu (hóa đơn, đơn hàng...)
  total_quantity?: number;            // Tổng số lượng các dòng
  total_value?: number;              // Tổng giá trị phiếu
  created_by?: string;               // ID người tạo
  notes?: string;                    // Ghi chú chung
  lines: WarehouseSlipLine[];        // Danh sách các dòng vật tư
  attachments: WarehouseSlipAttachment[]; // Danh sách tệp đính kèm
  processed_transactions?: string[];  // ID các giao dịch kho đã xử lý
  created_date?: string;             // Ngày tạo phiếu
}
