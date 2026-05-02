/**
 * Thông tin kho hàng
 * Đại diện cho một kho trong hệ thống quản lý kho
 */
export interface Warehouse {
  _id: string;              // ID MongoDB (tự động sinh)
  warehouse_id: string;      // Mã kho (do người dùng định nghĩa)
  warehouse_name: string;    // Tên kho
  description?: string;       // Mô tả chi tiết về kho
  is_active: boolean;        // Trạng thái hoạt động (true: đang hoạt động)
  created_date: string;      // Ngày tạo
  modified_date?: string;    // Ngày cập nhật gần nhất
}

/**
 * Dữ liệu tạo mới kho
 * Dùng khi gọi API POST /warehouses
 */
export interface CreateWarehouseRequest {
  warehouse_id: string;      // Mã kho (duy nhất)
  warehouse_name: string;    // Tên kho
  description?: string;       // Mô tả (tùy chọn)
  is_active?: boolean;       // Trạng thái (mặc định: true)
}

/**
 * Dữ liệu cập nhật thông tin kho
 * Dùng khi gọi API PATCH /warehouses/:id
 */
export interface UpdateWarehouseRequest {
  warehouse_id?: string;     // Cập nhật mã kho
  warehouse_name?: string;   // Cập nhật tên kho
  description?: string;      // Cập nhật mô tả
  is_active?: boolean;       // Cập nhật trạng thái
}

/**
 * Response phân trang cho danh sách kho
 * Trả về từ API GET /warehouses với tham số phân trang
 */
export interface PaginatedWarehouseResponse {
  data: Warehouse[];         // Danh sách kho trong trang hiện tại
  pagination: {
    page: number;            // Trang hiện tại
    limit: number;           // Số items mỗi trang
    total: number;           // Tổng số kho
    totalPages: number;      // Tổng số trang
  };
}

/**
 * Tham số tìm kiếm kho
 * Dùng để lọc và phân trang danh sách kho
 */
export interface WarehouseSearchParams {
  page?: number;             // Trang (mặc định: 1)
  limit?: number;            // Số items/trang (mặc định: 10)
  q?: string;               // Từ khóa tìm kiếm (theo tên hoặc mã kho)
}
