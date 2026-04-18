/**
 * useAuth Hook
 * Custom hook để sử dụng authentication utilities trong React components
 */

import { useState, useEffect } from 'react';
import {
  isTokenValid,
  getCurrentUser,
  getCurrentUserRole,
  hasPermission,
  isManager,
  isOperator,
  isQCTechnician,
  isITAdmin,
  logout,
  getTokenExpirationTime,
  isTokenExpiringSoon,
} from '../utils/authUtils';

interface User {
  user_id?: string;
  role?: string;
  username?: string;
  email?: string;
}

interface UseAuthReturn {
  // Authentication status
  isAuthenticated: boolean;
  isLoading: boolean;

  // User info
  user: User | null;
  userRole: string | null;

  // Role checks
  isManager: boolean;
  isOperator: boolean;
  isQCTechnician: boolean;
  isITAdmin: boolean;

  // Permission check
  hasPermission: (roles: string | string[]) => boolean;

  // Token info
  tokenExpirationTime: number | null;
  isTokenExpiringSoon: boolean;

  // Logout
  logout: () => void;
}

/**
 * Hook để quản lý authentication state
 * Tự động re-render khi auth status thay đổi
 */
export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [tokenExpirationTime, setTokenExpirationTime] = useState<number | null>(null);
  const [isTokenExpiringSoonState, setIsTokenExpiringSoonState] = useState(false);

  useEffect(() => {
    // Check auth status on mount
    const checkAuth = () => {
      if (isTokenValid()) {
        const currentUser = getCurrentUser();
        const currentRole = getCurrentUserRole();
        const expTime = getTokenExpirationTime();
        const expiringSoon = isTokenExpiringSoon();

        setUser(currentUser);
        setUserRole(currentRole);
        setTokenExpirationTime(expTime);
        setIsTokenExpiringSoonState(expiringSoon);
      } else {
        setUser(null);
        setUserRole(null);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Set up interval to check token expiration
    const interval = setInterval(checkAuth, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    setUserRole(null);
    window.location.href = '/login';
  };

  return {
    isAuthenticated: isTokenValid(),
    isLoading,
    user,
    userRole,
    isManager: isManager(),
    isOperator: isOperator(),
    isQCTechnician: isQCTechnician(),
    isITAdmin: isITAdmin(),
    hasPermission,
    tokenExpirationTime,
    isTokenExpiringSoon: isTokenExpiringSoonState,
    logout: handleLogout,
  };
}

/**
 * Hook để check specific permission
 * @param requiredRoles - Role(s) cần check
 * @returns boolean
 */
export function usePermission(requiredRoles: string | string[]): boolean {
  const { userRole } = useAuth();

  if (!userRole) return false;

  if (typeof requiredRoles === 'string') {
    return userRole === requiredRoles;
  }

  return requiredRoles.includes(userRole);
}

/**
 * Hook để check if user is specific role
 */
export function useIsManager(): boolean {
  return usePermission('manager');
}

export function useIsOperator(): boolean {
  return usePermission('operator');
}

export function useIsQCTechnician(): boolean {
  return usePermission('quality-control');
}

export function useIsITAdmin(): boolean {
  return usePermission('it_admin');
}
