/**
 * Các loại nhãn mác trong hệ thống dược phẩm
 * Raw Material: Nhãn nguyên liệu
 * Sample: Nhãn mẫu
 * Intermediate: Nhãn bán thành phẩm
 * Finished Product: Nhãn thành phẩm
 * API: Nhãn hoạt chất
 * Status: Nhãn trạng thái (Quarantine, Accepted...)
 */
export const LABEL_TYPES = [
  'Raw Material',
  'Sample',
  'Intermediate',
  'Finished Product',
  'API',
  'Status',
] as const;

export type LabelType = (typeof LABEL_TYPES)[number];

/**
 * Thông tin mẫu nhãn (Label Template)
 * Dùng để in nhãn cho lô hàng, thành phẩm...
 */
export interface LabelTemplate {
  _id: string;                  // ID MongoDB
  template_id: string;          // Mã mẫu nhãn
  template_name: string;         // Tên mẫu nhãn
  label_type: LabelType;        // Loại nhãn
  template_content: string;     // Nội dung mẫu (HTML/ZPL...)
  width: number;               // Chiều rộng nhãn (mm)
  height: number;              // Chiều cao nhãn (mm)
  created_date: string;         // Ngày tạo
  modified_date: string;       // Ngày cập nhật
}

/**
 * Dữ liệu tạo mới mẫu nhãn
 * Gửi lên API POST /label-templates
 */
export interface CreateLabelTemplateRequest {
  template_id: string;          // Mã mẫu nhãn
  template_name: string;         // Tên mẫu
  label_type: LabelType;        // Loại nhãn
  template_content: string;     // Nội dung mẫu
  width: number;               // Chiều rộng
  height: number;              // Chiều cao
}

/**
 * Dữ liệu cập nhật mẫu nhãn
 * Gửi lên API PATCH /label-templates/:id
 */
export interface UpdateLabelTemplateRequest {
  template_name?: string;        // Cập nhật tên
  label_type?: LabelType;       // Cập nhật loại
  template_content?: string;    // Cập nhật nội dung
  width?: number;              // Cập nhật chiều rộng
  height?: number;             // Cập nhật chiều cao
}

/**
 * Dữ liệu yêu cầu in nhãn
 * Từ mẫu nhãn + dữ liệu lô/sản xuất → sinh nhãn thực tế
 */
export interface GenerateLabelRequest {
  template_id: string;          // ID mẫu nhãn
  lot_id?: string;              // ID lô hàng (nếu in nhãn lô)
  batch_id?: string;            // ID lô sản xuất (nếu in nhãn thành phẩm)
}

/**
 * Kết quả sinh nhãn
 * Trả về từ API POST /label-templates/generate
 */
export interface GenerateLabelResponse {
  template: LabelTemplate;              // Mẫu nhãn đã dùng
  populatedContent: string;             // Nội dung nhãn đã điền dữ liệu
  sourceData: Record<string, unknown>;  // Dữ liệu nguồn (lô, batch...)
  generatedAt: string;                  // Thời điểm sinh nhãn
}

/**
 * Response phân trang cho danh sách mẫu nhãn
 */
export interface PaginatedLabelTemplateResponse {
  data: LabelTemplate[];     // Danh sách mẫu trong trang
  total: number;             // Tổng số mẫu
  page: number;              // Trang hiện tại
  limit: number;             // Số items mỗi trang
  totalPages: number;        // Tổng số trang
}

/**
 * Tham số tìm kiếm mẫu nhãn
 */
export interface LabelTemplateSearchParams {
  page?: number;             // Trang
  limit?: number;            // Số items/trang
  q?: string;               // Từ khóa tìm kiếm
  type?: LabelType;         // Lọc theo loại nhãn
}
