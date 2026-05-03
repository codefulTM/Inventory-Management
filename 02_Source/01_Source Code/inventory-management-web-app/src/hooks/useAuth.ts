/**
 * useAuth Hook - Hook quản lý trạng thái xác thực người dùng
 * 
 * Chức năng chính:
 * - Kiểm tra token có hợp lệ không (isAuthenticated)
 * - Lấy thông tin user (user, userRole)
 * - Kiểm tra vai trò (isManager, isOperator, isQC, isITAdmin)
 * - Kiểm tra quyền hạn (hasPermission)
 * - Theo dõi thời gian hết hạn token (tokenExpirationTime, isTokenExpiringSoon)
 * - Xử lý đăng xuất (logout)
 * 
 * Tự động kiểm tra mỗi 60 giây để cập nhật trạng thái
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

/** Interface định nghĩa thông tin người dùng */
interface User {
  user_id?: string;  // ID người dùng
  role?: string;      // Vai trò (manager, operator, ...)
  username?: string;  // Tên đăng nhập
  email?: string;     // Email
}

/** Interface định nghĩa giá trị trả về từ useAuth hook */
interface UseAuthReturn {
  // Trạng thái xác thực
  isAuthenticated: boolean;  // Đã đăng nhập chưa
  isLoading: boolean;       // Đang kiểm tra

  // Thông tin người dùng
  user: User | null;      // Thông tin user
  userRole: string | null;  // Vai trò hiện tại

  // Kiểm tra vai trò nhanh
  isManager: boolean;        // Có phải Manager?
  isOperator: boolean;       // Có phải Operator?
  isQCTechnician: boolean; // Có phải QC?
  isITAdmin: boolean;       // Có phải IT Admin?

  // Kiểm tra quyền hạn
  hasPermission: (roles: string | string[]) => boolean; // Check quyền

  // Thông tin token
  tokenExpirationTime: number | null;  // Thời gian hết hạn (timestamp)
  isTokenExpiringSoon: boolean;    // Sắp hết hạn (<5 phút)?

  // Đăng xuất
  logout: () => void;
}

/**
 * Hook chính quản lý xác thực
 * Tự động cập nhật trạng thái mỗi 60 giây
 */
export function useAuth(): UseAuthReturn {
  // Các state lưu trữ trạng thái xác thực
  const [isLoading, setIsLoading] = useState(true); // Đang tải thông tin xác thực
  const [user, setUser] = useState<User | null>(null); // Thông tin user
  const [userRole, setUserRole] = useState<string | null>(null); // Vai trò
  const [tokenExpirationTime, setTokenExpirationTime] = useState<number | null>(null); // Hết hạn
  const [isTokenExpiringSoonState, setIsTokenExpiringSoonState] = useState(false); // Sắp hết hạn

  useEffect(() => {
    // Hàm kiểm tra trạng thái xác thực
    const checkAuth = () => {
      if (isTokenValid()) {
        // Token hợp lệ -> Lấy thông tin user
        const currentUser = getCurrentUser();
        const currentRole = getCurrentUserRole();
        const expTime = getTokenExpirationTime();
        const expiringSoon = isTokenExpiringSoon();

        setUser(currentUser);
        setUserRole(currentRole);
        setTokenExpirationTime(expTime);
        setIsTokenExpiringSoonState(expiringSoon);
      } else {
        // Token không hợp lệ -> Reset
        setUser(null);
        setUserRole(null);
      }
      setIsLoading(false);
    };

    checkAuth(); // Kiểm tra ngay khi mount

    // Thiết lập interval kiểm tra mỗi 60 giây
    const interval = setInterval(checkAuth, 60000); // 60000ms = 1 phút

    return () => clearInterval(interval); // Cleanup khi unmount
  }, []);

  // Hàm xử lý đăng xuất
  const handleLogout = () => {
    logout(); // Gọi hàm logout từ authUtils (xóa token)
    setUser(null);
    setUserRole(null);
    window.location.href = '/login'; // Redirect về trang login
  };

  return {
    isAuthenticated: isTokenValid(), // Kiểm tra token có hợp lệ không
    isLoading,
    user,
    userRole,
    isManager: isManager(), // Gọi thẳng từ authUtils
    isOperator: isOperator(),
    isQCTechnician: isQCTechnician(),
    isITAdmin: isITAdmin(),
    hasPermission, // Hàm check quyền từ authUtils
    tokenExpirationTime,
    isTokenExpiringSoon: isTokenExpiringSoonState,
    logout: handleLogout,
  };
}

/**
 * Hook kiểm tra quyền hạn cụ thể
 * @param requiredRoles - Vai trò cần kiểm tra (string hoặc array)
 * @returns boolean - Có quyền hay không
 * 
 * Ví dụ: usePermission('manager') hoặc usePermission(['manager', 'operator'])
 */
export function usePermission(requiredRoles: string | string[]): boolean {
  const { userRole } = useAuth();

  if (!userRole) return false; // Chưa đăng nhập -> false

  if (typeof requiredRoles === 'string') {
    return userRole === requiredRoles; // 1 vai trò
  }

  return requiredRoles.includes(userRole); // Nhiều vai trò
}

/** Hook kiểm tra có phải Manager không */
export function useIsManager(): boolean {
  return usePermission('manager');
}

/** Hook kiểm tra có phải Operator không */
export function useIsOperator(): boolean {
  return usePermission('operator');
}

/** Hook kiểm tra có phải QC Technician không */
export function useIsQCTechnician(): boolean {
  return usePermission('quality-control');
}

/** Hook kiểm tra có phải IT Admin không */
export function useIsITAdmin(): boolean {
  return usePermission('it_admin');
}
