/**
 * File: role-mapper.ts
 * Mô tả: Utility giúp ánh xạ (map) realm roles từ Keycloak sang UserRole của hệ thống.
 *
 * Chức năng chính:
 * - Chuẩn hóa tên role (lowercase, thay thế khoảng trắng bằng dấu gạch dưới)
 * - Hỗ trợ nhiều alias cho cùng một role (ví dụ: 'admin_manager' → MANAGER)
 * - Fallback: Nếu không tìm thấy role từ token, thử suy luận từ username
 * - Mặc định: Nếu không xác định được → gán OPERATOR
 *
 * Danh sách role hợp lệ trong hệ thống (UserRole):
 * - Manager (Quản lý)
 * - Operator (Nhân viên vận hành kho)
 * - Quality Control Technician (Nhân viên kiểm soát chất lượng)
 * - IT Administrator (Quản trị viên IT)
 */
import { UserRole } from '../../schemas/user.schema';

/**
 * Bản đồ ánh xạ các alias sang UserRole chính thức
 * Ví dụ: 'admin_manager', 'manager' đều được map về UserRole.MANAGER
 */
const ROLE_ALIAS_MAP: Record<string, UserRole> = {
  manager: UserRole.MANAGER,
  admin_manager: UserRole.MANAGER,

  operator: UserRole.OPERATOR,
  admin_operator: UserRole.OPERATOR,

  qc: UserRole.QC_TECHNICIAN,
  qctechnician: UserRole.QC_TECHNICIAN,
  qc_technician: UserRole.QC_TECHNICIAN,
  quality_control_technician: UserRole.QC_TECHNICIAN,
  admin_qc: UserRole.QC_TECHNICIAN,

  it: UserRole.IT_ADMINISTRATOR,
  it_admin: UserRole.IT_ADMINISTRATOR,
  it_administrator: UserRole.IT_ADMINISTRATOR,
  admin_it: UserRole.IT_ADMINISTRATOR,
};

/**
 * Chuẩn hóa chuỗi: trim, lowercase, thay thế khoảng trắng và dấu gạch ngang bằng dấu gạch dưới
 */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Ánh xạ realm roles từ Keycloak sang UserRole của hệ thống
 * @param realmRoles - Danh sách roles từ Keycloak token
 * @param usernameHint - Tên đăng nhập (dùng để suy luận nếu không có role rõ ràng)
 * @returns UserRole tương ứng, mặc định là OPERATOR
 */
export function mapRealmRolesToUserRole(
  realmRoles: string[] | undefined,
  usernameHint?: string,
): UserRole {
  const appRoles = Object.values(UserRole);
  const normalizedRealmRoles = (realmRoles ?? []).map(normalize);

  // Ưu tiên 1: Tìm role chính thức trong danh sách realm roles
  for (const appRole of appRoles) {
    if (normalizedRealmRoles.includes(normalize(appRole))) {
      return appRole;
    }
  }

  // Ưu tiên 2: Tìm trong bản đồ alias
  for (const normalizedRole of normalizedRealmRoles) {
    const mapped = ROLE_ALIAS_MAP[normalizedRole];
    if (mapped) {
      return mapped;
    }
  }

  // Ưu tiên 3: Suy luận từ username (ví dụ: username chứa 'admin', 'manager')
  if (usernameHint) {
    const mappedFromUsername = ROLE_ALIAS_MAP[normalize(usernameHint)];
    if (mappedFromUsername) {
      return mappedFromUsername;
    }
  }

  // Mặc định: Operator
  return UserRole.OPERATOR;
}

/**
 * Tạo email fallback nếu user không có email trong Keycloak
 * Format: username@inventory.local
 */
export function buildFallbackEmail(username: string): string {
  const normalized = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  return `${normalized || 'user'}@inventory.local`;
}
