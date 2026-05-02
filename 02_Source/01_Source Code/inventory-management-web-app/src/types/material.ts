/**
 * Loại vật tư trong hệ thống dược/thực phẩm chức năng
 * API: Active Pharmaceutical Ingredient (Hoạt chất)
 * Excipient: Tá dược
 * Dietary Supplement: Thực phẩm bổ sung
 * Container: Bao bì chứa đựng
 * Closure: Nắp đóng bao bì
 * Process Chemical: Hóa chất dùng trong quá trình sản xuất
 * Testing Material: Vật tư phục vụ kiểm nghiệm
 */
export type MaterialType =
  | "API"
  | "Excipient"
  | "Dietary Supplement"
  | "Container"
  | "Closure"
  | "Process Chemical"
  | "Testing Material";

/**
 * Thông tin vật tư (Material Master Data)
 * Là dữ liệu gốc về các loại vật tư có trong hệ thống
 */
export interface Material {
  _id: string;                        // ID MongoDB
  material_id: string;                // Mã vật tư (duy nhất)
  part_number: string;                 // Mã part number (theo nhà sản xuất)
  material_name: string;               // Tên vật tư
  material_type: MaterialType;         // Loại vật tư
  storage_conditions?: string;        // Điều kiện bảo quản (nhiệt độ, độ ẩm...)
  specification_document?: string;    // Tài liệu thông số kỹ thuật
  created_date: string;               // Ngày tạo
  modified_date?: string;             // Ngày cập nhật
  created_by?: string;                // Người tạo
  approved_by?: string;               // Người phê duyệt
  status: "Pending" | "Approved" | "Rejected"; // Trạng thái duyệt
}

/**
 * Dữ liệu tạo mới vật tư
 * Gửi lên API POST /materials
 */
export interface CreateMaterialRequest {
  material_id: string;                // Mã vật tư
  part_number: string;                // Mã part number
  material_name: string;              // Tên vật tư
  material_type: MaterialType;        // Loại vật tư
  storage_conditions?: string;       // Điều kiện bảo quản
  specification_document?: string;   // Tài liệu thông số
}

/**
 * Dữ liệu cập nhật vật tư
 * Gửi lên API PATCH /materials/:id
 */
export interface UpdateMaterialRequest {
  part_number?: string;               // Cập nhật mã part number
  material_name?: string;             // Cập nhật tên
  material_type?: MaterialType;       // Cập nhật loại
  storage_conditions?: string;       // Cập nhật điều kiện bảo quản
  specification_document?: string;   // Cập nhật tài liệu
}

/**
 * Response phân trang cho danh sách vật tư
 */
export interface PaginatedMaterialResponse {
  data: Material[];            // Danh sách vật tư trong trang
  pagination: {
    page: number;              // Trang hiện tại
    limit: number;             // Số items mỗi trang
    total: number;             // Tổng số vật tư
    totalPages: number;        // Tổng số trang
  };
}

/**
 * Tham số tìm kiếm và lọc vật tư
 */
export interface MaterialSearchParams {
  page?: number;              // Trang (mặc định: 1)
  limit?: number;             // Số items/trang (mặc định: 10)
  q?: string;                 // Từ khóa tìm kiếm (theo tên, mã...)
  type?: MaterialType;        // Lọc theo loại vật tư
}
