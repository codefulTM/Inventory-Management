/**
 * Role Mapper - Chuyển đổi role từ Keycloak sang UserRole của ứng dụng
 * 
 * Chức năng:
 * - Map realm roles từ Keycloak token sang UserRole enum của ứng dụng
 * - Hỗ trợ nhiều alias (bí danh) cho mỗi role
 * - Fallback: Nếu không tìm thấy role, mặc định trả về OPERATOR
 * - Có thể suy luận role từ username nếu cần thiết
 * 
 * Các role trong hệ thống:
 * - MANAGER: Quản lý kho (có quyền cao nhất trong nghiệp vụ kho)
 * - OPERATOR: Nhân viên vận hành kho (nhập/xuất kho, quản lý lô...)
 * - QC_TECHNICIAN: Kỹ thuật viên kiểm tra chất lượng
 * - IT_ADMINISTRATOR: Quản trị viên hệ thống
 */

import { UserRole } from '../../schemas/user.schema';

/**
 * Bản đồ ánh xạ các alias (bí danh) sang UserRole chính thức
 * Hỗ trợ nhiều cách đặt tên khác nhau cho cùng một role
 */
const ROLE_ALIAS_MAP: Record<string, UserRole> = {
  // Manager roles
  manager: UserRole.MANAGER,
  admin_manager: UserRole.MANAGER,

  // Operator roles
  operator: UserRole.OPERATOR,
  admin_operator: UserRole.OPERATOR,

  // Quality Control roles
  qc: UserRole.QC_TECHNICIAN,
  qctechnician: UserRole.QC_TECHNICIAN,
  qc_technician: UserRole.QC_TECHNICIAN,
  quality_control_technician: UserRole.QC_TECHNICIAN,
  admin_qc: UserRole.QC_TECHNICIAN,

  // IT Administrator roles
  it: UserRole.IT_ADMINISTRATOR,
  it_admin: UserRole.IT_ADMINISTRATOR,
  it_administrator: UserRole.IT_ADMINISTRATOR,
  admin_it: UserRole.IT_ADMINISTRATOR,
};

/**
 * Chuẩn hóa chuỗi role:
 * - Loại bỏ khoảng trắng đầu/cuối
 * - Chuyển về chữ thường
 * - Thay thế khoảng trắng và dấu gạch ngang bằng dấu gạch dưới
 */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Chuyển đổi realm roles từ Keycloak sang UserRole của ứng dụng
 * 
 * @param realmRoles - Danh sách realm roles từ Keycloak token
 * @param usernameHint - Username để suy luận role (fallback)
 * @returns UserRole - Role tương ứng trong ứng dụng
 * 
 * Thứ tự ưu tiên:
 * 1. So khớp trực tiếp với UserRole enum values
 * 2. So khớp với ROLE_ALIAS_MAP
 * 3. Suy luận từ username
 * 4. Mặc định: OPERATOR
 */
export function mapRealmRolesToUserRole(
  realmRoles: string[] | undefined,
  usernameHint?: string,
): UserRole {
  const appRoles = Object.values(UserRole);
  const normalizedRealmRoles = (realmRoles ?? []).map(normalize);

  // Ưu tiên 1: So khớp trực tiếp với các giá trị trong UserRole enum
  for (const appRole of appRoles) {
    if (normalizedRealmRoles.includes(normalize(appRole))) {
      return appRole;
    }
  }

  // Ưu tiên 2: So khớp với ROLE_ALIAS_MAP (hỗ trợ nhiều alias)
  for (const normalizedRole of normalizedRealmRoles) {
    const mapped = ROLE_ALIAS_MAP[normalizedRole];
    if (mapped) {
      return mapped;
    }
  }

  // Ưu tiên 3: Thử suy luận role từ username (nếu có)
  if (usernameHint) {
    const mappedFromUsername = ROLE_ALIAS_MAP[normalize(usernameHint)];
    if (mappedFromUsername) {
      return mappedFromUsername;
    }
  }

  // Mặc định: OPERATOR (quyền thấp nhất trong nghiệp vụ kho)
  return UserRole.OPERATOR;
}

/**
 * Tạo email giả (fallback) từ username
 * Dùng khi token không chứa email
 * 
 * @param username - Tên đăng nhập
 * @returns Email dạng username@inventory.local
 */
export function buildFallbackEmail(username: string): string {
  const normalized = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, ''); // Chỉ giữ lại ký tự hợp lệ cho email
  return `${normalized || 'user'}@inventory.local`;
}
