/**
 * Authentication Types
 * Định nghĩa các kiểu dữ liệu liên quan đến xác thực và phân quyền
 */

/**
 * Vai trò người dùng trong hệ thống
 * Tương ứng với các role được định nghĩa trong Keycloak
 */
export type UserRole = 'Manager' | 'Operator' | 'Quality Control Technician' | 'IT Administrator';

/**
 * Thông tin người dùng
 * Được trả về từ API và lưu trong localStorage sau khi đăng nhập
 */
export interface User {
  _id: string;              // ID nội bộ trong MongoDB
  user_id?: string;         // ID dùng để phân quyền (có thể khác _id)
  username: string;         // Tên đăng nhập
  email: string;            // Email liên hệ
  role: UserRole;           // Vai trò của người dùng
  is_active: boolean;       // Trạng thái kích hoạt (false = bị khóa)
  last_login?: string;      // Thời điểm đăng nhập gần nhất
  created_date?: string;    // Thời điểm tạo tài khoản
  modified_date?: string;   // Thời điểm cập nhật gần nhất
}