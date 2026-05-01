import { UserRole } from '../../schemas/user.schema';

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

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

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

export function buildFallbackEmail(username: string): string {
  const normalized = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  return `${normalized || 'user'}@inventory.local`;
}
