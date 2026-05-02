/**
 * File: role-mapper.ts
 * Mô tả: Tiện ích ánh xạ role từ Keycloak sang UserRole của hệ thống
 * Chức năng: Chuyển đổi tên role từ Keycloak Realm sang enum UserRole chuẩn
 * 
 * Vấn đề: Keycloak có thể trả về nhiều biến thể tên role khác nhau
 * (vd: "qc", "qc_technician", "quality_control_technician" đều cùng chỉ QC Technician)
 * Utility này chuẩn hóa và ánh xạ tất cả biến thể về enum UserRole thống nhất
 */
import { UserRole } from '../schemas/user.schema';

/**
 * Bảng ánh xạ alias → UserRole chuẩn
 * Chứa tất cả biến thể tên role có thể gặp từ Keycloak
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
 * Chuẩn hóa tên role: loại bỏ khoảng trắng thừa, chuyển lowercase,
 * thay thế dấu cách/dấu gạch ngang bằng gạch dưới
 * Ví dụ: "Quality Control Technician" → "quality_control_technician"
 */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Ánh xạ danh sách role từ Keycloak Realm sang UserRole của ứng dụng
 * 
 * Chiến lược ánh xạ (theo thứ tự ưu tiên):
 * 1. Khớp trực tiếp tên enum UserRole với realm roles (đã chuẩn hóa)
 * 2. Tra cứu bảng alias ROLE_ALIAS_MAP theo realm roles
 * 3. Thử ánh xạ dựa trên username (fallback)
 * 4. Mặc định trả về OPERATOR nếu không tìm thấy match nào
 * 
 * @param realmRoles - Danh sách role từ Keycloak token (realm_access.roles)
 * @param usernameHint - Gợi ý username để fallback ánh xạ role
 * @returns UserRole chuẩn của hệ thống
 */
export function mapRealmRolesToUserRole(
  realmRoles: string[] | undefined,
  usernameHint?: string,
): UserRole {
  const appRoles = Object.values(UserRole);
  const normalizedRealmRoles = (realmRoles ?? []).map(normalize);

  for (const appRole of appRoles) {
    if (normalizedRealmRoles.includes(normalize(appRole))) {
      return appRole;
    }
  }

  for (const normalizedRole of normalizedRealmRoles) {
    const mapped = ROLE_ALIAS_MAP[normalizedRole];
    if (mapped) {
      return mapped;
    }
  }

  if (usernameHint) {
    const mappedFromUsername = ROLE_ALIAS_MAP[normalize(usernameHint)];
    if (mappedFromUsername) {
      return mappedFromUsername;
    }
  }

  return UserRole.OPERATOR;
}

/**
 * Tạo email fallback từ username khi Keycloak không cung cấp email
 * Định dạng: {username}@inventory.local
 * 
 * @param username - Tên đăng nhập của user
 * @returns Email giả định cho hệ thống
 */
export function buildFallbackEmail(username: string): string {
  const normalized = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  return `${normalized || 'user'}@inventory.local`;
}
