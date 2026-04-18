/**
 * Authentication Utilities
 * Cung cấp các helper functions để check token, role, và permissions
 */

/**
 * Validate JWT token format và kiểm tra hết hạn
 * @param token - JWT token để validate (nếu không pass, lấy từ localStorage)
 * @returns boolean - true nếu token hợp lệ và chưa hết hạn
 */
export function isTokenValid(token?: string): boolean {
  const tokenToCheck = token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);

  if (!tokenToCheck) return false;

  try {
    // Decode JWT payload (without server-side verification)
    const parts = tokenToCheck.split('.');
    if (parts.length !== 3) return false;

    const decoded = JSON.parse(atob(parts[1]));
    const exp = decoded.exp;

    // Check if token expired
    if (exp && exp * 1000 < Date.now()) {
      localStorage.removeItem('auth_token');
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get current user từ localStorage
 * @returns User object hoặc null
 */
export function getCurrentUser(): { user_id?: string; role?: string; username?: string; email?: string } | null {
  try {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Get user's role
 * @returns Role string hoặc null
 */
export function getCurrentUserRole(): string | null {
  const user = getCurrentUser();
  if (!user?.role) return null;

  // Normalize role: convert backend format to frontend format if needed
  const role = user.role as string;
  const roleMap: Record<string, string> = {
    'Manager': 'manager',
    'Operator': 'operator',
    'Quality Control Technician': 'quality-control',
    'IT Administrator': 'it_admin',
  };

  // Return mapped value or original (if already in frontend format)
  return roleMap[role] || role;
}

/**
 * Get user ID
 * @returns User ID hoặc null
 */
export function getCurrentUserId(): string | null {
  const user = getCurrentUser();
  return user?.user_id || null;
}

/**
 * Check if user có quyền truy cập (check role)
 * @param requiredRoles - Role string hoặc array of roles
 * @returns boolean - true nếu user có quyền
 */
export function hasPermission(requiredRoles: string | string[]): boolean {
  const userRole = getCurrentUserRole();
  if (!userRole) return false;

  if (typeof requiredRoles === 'string') {
    return userRole === requiredRoles;
  }

  return requiredRoles.includes(userRole);
}

/**
 * Check if user là Manager
 */
export function isManager(): boolean {
  return hasPermission('manager');
}

/**
 * Check if user là Operator
 */
export function isOperator(): boolean {
  return hasPermission('operator');
}

/**
 * Check if user là QC Technician
 */
export function isQCTechnician(): boolean {
  return hasPermission('quality-control');
}

/**
 * Check if user là IT Admin
 */
export function isITAdmin(): boolean {
  return hasPermission('it_admin');
}

/**
 * Check if user authenticated
 */
export function isAuthenticated(): boolean {
  return isTokenValid();
}

/**
 * Logout user - xóa token và user info
 */
export function logout(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('refresh_token');
}

/**
 * Login user - lưu token và user info
 */
export function login(token: string, user: any, refreshToken?: string): void {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user', JSON.stringify(user));
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
}

/**
 * Clear all auth data
 */
export function clearAuthData(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('refresh_token');
}

/**
 * Get appropriate dashboard URL based on user role
 */
export function getDashboardUrl(): string {
  const userRole = getCurrentUserRole();

  const dashboardMap: Record<string, string> = {
    manager: '/manager/dashboard',
    operator: '/operator/dashboard',
    'quality-control': '/qc/dashboard',
    it_admin: '/admin/dashboard',
  };

  return userRole ? (dashboardMap[userRole] || '/') : '/login';
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpirationTime(): number | null {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decoded = JSON.parse(atob(parts[1]));
    const exp = decoded.exp;

    if (exp) {
      const timeLeft = exp * 1000 - Date.now();
      return Math.max(0, timeLeft);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if token is about to expire (within 5 minutes)
 */
export function isTokenExpiringSoon(): boolean {
  const timeLeft = getTokenExpirationTime();
  if (timeLeft === null) return false;

  // 5 minutes = 300000 ms
  return timeLeft < 300000;
}
