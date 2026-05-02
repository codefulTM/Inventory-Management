/**
 * Loại đơn đặt hàng nhập/xuất kho
 * Inbound: Đơn nhập (từ nhà cung cấp)
 * Outbound: Đơn xuất (đến khách hàng)
 */
export type ImportExportOrderType = "Inbound" | "Outbound";

/**
 * Trạng thái đơn đặt hàng
 * PendingConfirmation: Chờ xác nhận (đang kiểm hàng)
 * Confirmed: Đã xác nhận (đã nhập/xuất kho)
 * Rejected: Đã từ chối (không đạt)
 */
export type ImportExportOrderStatus =
  | "PendingConfirmation"
  | "Confirmed"
  | "Rejected";

/**
 * Nguồn gốc tệp đính kèm
 * camera: Chụp từ camera (thực tế)
 * upload: Tải lên từ máy tính (hóa đơn scan...)
 */
export type ImportExportAttachmentSource = "camera" | "upload";

/**
 * Cách thức quét mã để nhận diện
 * lot_id: Quét theo mã lô
 * manufacturer_lot: Quét theo số lô nhà sản xuất
 * material_id: Quét theo mã vật tư
 * part_number: Quét theo mã part number
 */
export type ScanMatchedBy =
  | "lot_id"
  | "manufacturer_lot"
  | "material_id"
  | "part_number";

/**
 * Một vật tư trong đơn đặt hàng
 * Đại diện cho một dòng vật tư cần nhập/xuất
 */
export interface ImportExportOrderItem {
  material_id: string;         // ID vật tư
  lot_id?: string;             // ID lô (nếu đã biết)
  quantity: number;            // Số lượng đặt
  unit_of_measure: string;     // Đơn vị tính
  expected_location?: string;  // Vị trí dự kiến (khi nhập/xuất)
}

/**
 * Tệp đính kèm trong đơn đặt hàng
 * Hóa đơn, chứng từ, ảnh xác nhận...
 */
export interface ImportExportOrderAttachment {
  file_id: string;                          // ID tệp
  original_name: string;                     // Tên gốc
  mime_type: string;                        // Loại MIME
  size_bytes: number;                       // Kích thước (byte)
  url: string;                              // Đường dẫn truy cập
  source: ImportExportAttachmentSource;     // Nguồn gốc (camera/upload)
  uploaded_by: string;                      // Người tải lên
  uploaded_at: string;                      // Thời điểm tải lên
}

/**
 * Vật tư đã xác nhận (sau khi kiểm hàng)
 * So sánh số lượng dự kiến và thực tế
 */
export interface ConfirmImportExportOrderItem {
  material_id: string;         // ID vật tư
  lot_id?: string;             // ID lô
  expected_quantity: number;   // Số lượng dự kiến
  actual_quantity: number;     // Số lượng thực tế
  variance_quantity: number;   // Chênh lệch (thừa/thiếu)
  unit_of_measure: string;     // Đơn vị tính
}

/**
 * Thông tin đơn đặt hàng nhập/xuất kho
 * Đơn hàng hoàn chỉnh với đầy đủ vật tư và chứng từ
 */
export interface ImportExportOrder {
  _id?: string;                              // ID MongoDB
  order_id: string;                           // Mã đơn hàng
  order_type: ImportExportOrderType;          // Loại đơn
  status: ImportExportOrderStatus;            // Trạng thái
  warehouse_id: string;                       // ID kho thực hiện
  reason?: string;                            // Lý do nhập/xuất
  reference_number?: string;                  // Số tham chiếu (PO/SO...)
  created_by: string;                         // Người tạo
  items: ImportExportOrderItem[];             // Danh sách vật tư
  attachments: ImportExportOrderAttachment[]; // Danh sách tệp đính kèm
  confirmed_by?: string;                      // Người xác nhận
  confirmed_at?: string;                      // Thời điểm xác nhận
  confirm_note?: string;                      // Ghi chú xác nhận
  blind_count_required?: boolean;            // Có yêu cầu kiểm đếm mù không
  confirmed_items?: ConfirmImportExportOrderItem[]; // Vật tư đã xác nhận
  created_date?: string;                     // Ngày tạo
  modified_date?: string;                    // Ngày cập nhật
}

/**
 * Dữ liệu tạo mới đơn đặt hàng
 * Gửi lên API POST /import-export-orders
 */
export interface CreateImportExportOrderPayload {
  order_type: ImportExportOrderType;          // Loại đơn
  warehouse_id: string;                       // Kho thực hiện
  reason?: string;                            // Lý do
  reference_number?: string;                  // Số tham chiếu
  items: ImportExportOrderItem[];             // Danh sách vật tư
  attachments?: ImportExportOrderAttachment[]; // Tệp đính kèm
}

/**
 * Dữ liệu cập nhật đơn đặt hàng
 * Gửi lên API PATCH /import-export-orders/:id
 */
export interface UpdateImportExportOrderPayload {
  order_type?: ImportExportOrderType;          // Cập nhật loại
  warehouse_id?: string;                       // Cập nhật kho
  reason?: string;                            // Cập nhật lý do
  reference_number?: string;                  // Cập nhật số tham chiếu
  items?: ImportExportOrderItem[];             // Cập nhật vật tư
  attachments?: ImportExportOrderAttachment[]; // Cập nhật tệp
}

/**
 * Tham số truy vấn danh sách đơn đặt hàng
 */
export interface ImportExportOrderQueryParams {
  status?: ImportExportOrderStatus;    // Lọc theo trạng thái
  order_type?: ImportExportOrderType;  // Lọc theo loại
  created_by?: string;                // Lọc theo người tạo
  from?: string | Date;               // Từ ngày tạo
  to?: string | Date;                 // Đến ngày tạo
  page?: number;                      // Trang
  limit?: number;                     // Số items/trang
}

/**
 * Response danh sách đơn đặt hàng có phân trang
 */
export interface ImportExportOrderListResponse {
  items: ImportExportOrder[];  // Danh sách đơn hàng
  total: number;               // Tổng số đơn
  page: number;                // Trang hiện tại
  limit: number;               // Số items/trang
}

/**
 * Thông tin vật tư được giải mã từ mã quét
 * Kết quả tìm kiếm khi quét mã vạch/QR
 */
export interface ResolveScanItem {
  material_id: string;           // ID vật tư
  lot_id: string | null;        // ID lô (nếu tìm thấy)
  material_name: string | null; // Tên vật tư
  unit_of_measure: string | null; // Đơn vị tính
  expected_location: string | null; // Vị trí dự kiến
  warehouse_id: string | null;  // Kho dự kiến
}

/**
 * Ảnh chụp nhanh lô hàng khi quét
 */
export interface ResolveScanLotSnapshot {
  status: string;              // Trạng thái lô
  quantity: number;           // Số lượng hiện tại
  manufacturer_lot: string;    // Số lô nhà sản xuất
}

/**
 * Kết quả quét mã để nhận diện vật tư/lô
 * Trả về từ API POST /import-export-orders/resolve-scan
 */
export interface ResolveImportExportOrderScanResult {
  scan_code: string;                          // Mã đã quét
  resolved: boolean;                          // Có tìm thấy không
  matched_by: ScanMatchedBy | null;          // Cách thức nhận diện
  item: ResolveScanItem | null;              // Thông tin vật tư
  lot: ResolveScanLotSnapshot | null;        // Thông tin lô
  warnings: string[];                        // Các cảnh báo
  message?: string;                          // Thông báo bổ sung
}

/**
 * Dữ liệu gửi đi khi quét mã
 */
export interface ResolveImportExportOrderScanPayload {
  scan_code: string;                          // Mã quét được
  order_type?: ImportExportOrderType;         // Loại đơn (để tối ưu tìm kiếm)
}

/**
 * Tùy chọn vật tư (dùng cho dropdown)
 */
export interface MaterialOption {
  material_id: string;   // ID vật tư
  material_name: string;  // Tên vật tư
  part_number: string;   // Mã part number
}

/**
 * Response danh sách vật tư có phân trang (dùng cho select)
 */
export interface MaterialOptionListResponse {
  data: MaterialOption[];  // Danh sách vật tư
  total: number;            // Tổng số
  page: number;             // Trang
  limit: number;            // Số items/trang
}

/**
 * Tùy chọn lô hàng (dùng cho dropdown)
 */
export interface InventoryLotOption {
  lot_id: string;           // ID lô
  material_id: string;      // ID vật tư
  quantity: number;         // Số lượng
  unit_of_measure: string;  // Đơn vị tính
  status: string;           // Trạng thái
  storage_location: string;  // Vị trí lưu kho
  warehouse_id?: string;    // ID kho
}

/**
 * Response danh sách lô hàng có phân trang
 */
export interface InventoryLotOptionListResponse {
  items: InventoryLotOption[];  // Danh sách lô
  total: number;                 // Tổng số
  page: number;                 // Trang
  limit: number;                // Số items/trang
}

/**
 * Tùy chọn kho (dùng cho dropdown)
 */
export interface WarehouseOption {
  warehouse_id: string;   // ID kho
  warehouse_name: string; // Tên kho
  is_active: boolean;     // Trạng thái hoạt động
}

/**
 * Response danh sách kho
 */
export interface WarehouseOptionListResponse {
  items: WarehouseOption[];  // Danh sách kho
  total: number;              // Tổng số
  page: number;               // Trang
  limit: number;              // Số items/trang
}

/**
 * Tùy chọn vị trí lưu kho (Zone/Rack/Bin)
 */
export interface StorageLocationOption {
  location_id: string;    // ID vị trí
  warehouse_id: string;    // ID kho
  location_name: string;  // Tên vị trí (VD: A-01-02)
  is_active: boolean;      // Trạng thái hoạt động
}

/**
 * Response danh sách vị trí lưu kho
 */
export interface StorageLocationOptionListResponse {
  items: StorageLocationOption[];  // Danh sách vị trí
  total: number;                    // Tổng số
  page: number;                     // Trang
  limit: number;                    // Số items/trang
}

/**
 * Dữ liệu tải lên tệp đính kèm
 */
export interface UploadImportExportOrderAttachmentPayload {
  file: File;                                    // Tệp cần tải lên
  source?: ImportExportAttachmentSource;         // Nguồn gốc
}

/**
 * Dữ liệu một vật tư khi xác nhận đơn hàng
 */
export interface ConfirmImportExportOrderItemPayload {
  material_id: string;      // ID vật tư
  lot_id?: string;          // ID lô
  expected_quantity: number; // Số lượng dự kiến
  actual_quantity: number;   // Số lượng thực tế
  unit_of_measure: string;  // Đơn vị tính
}

/**
 * Dữ liệu xác nhận đơn hàng hoàn chỉnh
 * Gửi lên API POST /import-export-orders/:id/confirm
 */
export interface ConfirmImportExportOrderPayload {
  confirmed_items: ConfirmImportExportOrderItemPayload[]; // Danh sách vật tư đã kiểm
  confirm_note?: string;                                  // Ghi chú xác nhận
}

/**
 * Dữ liệu từ chối đơn hàng
 * Gửi lên API POST /import-export-orders/:id/reject
 */
export interface RejectImportExportOrderPayload {
  reason: string;  // Lý do từ chối
}

/**
 * Một vật tư trong form nhập liệu (chưa gửi API)
 */
export interface ImportExportOrderFormItem {
  material_id: string;     // ID vật tư
  lot_id?: string;         // ID lô
  quantity: number;        // Số lượng
  unit_of_measure: string; // Đơn vị tính
  expected_location?: string; // Vị trí dự kiến
}

/**
 * Giá trị form tạo/cập nhật đơn đặt hàng
 * Dùng với react-hook-form
 */
export interface ImportExportOrderFormValues {
  warehouse_id: string;                      // Kho thực hiện
  reason: string;                            // Lý do
  reference_number: string;                  // Số tham chiếu
  items: ImportExportOrderFormItem[];         // Danh sách vật tư
}
