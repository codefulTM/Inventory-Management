/**
 * User Service
 * Service quản lý người dùng (User Management)
 * CRUD: getAll, create, update, activate, deactivate, search
 * Dùng cho trang User Management của IT Admin và Manager
 */

import { apiClient } from './apiClient';

/**
 * Vai trò người dùng trong hệ thống
 */
export type UserRole = 'Manager' | 'Operator' | 'Quality Control Technician' | 'IT Administrator';

/**
 * Thông tin người dùng
 */
export interface User {
  user_id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;          // Trạng thái kích hoạt
  lock_type?: 'locked' | 'deactivated';  // Loại khóa (tạm thời/vĩnh viễn)
  lock_reason?: string;        // Lý do khóa
  last_login?: string;
  created_date?: string;
}

/**
 * Payload khi tạo người dùng mới
 */
export interface CreateUserPayload {
  username: string;
  email: string;
  role: UserRole;
}

/**
 * Payload khi cập nhật người dùng (chỉ email và role)
 */
export interface UpdateUserPayload {
  email?: string;
  role?: UserRole;
}

/**
 * Response phân trang cho danh sách người dùng
 */
export interface PaginatedUsers {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * UserService - Class quản lý các tác vụ liên quan đến người dùng
 */
export const UserService = {
  /**
   * Lấy danh sách người dùng phân trang
   */
  async getAll(page = 1, limit = 20) {
    return apiClient.get<PaginatedUsers>(`/users?page=${page}&limit=${limit}`);
  },

  /**
   * Tạo người dùng mới
   */
  async create(payload: CreateUserPayload) {
    return apiClient.post<User>('/users', payload);
  },

  /**
   * Tìm kiếm người dùng theo từ khóa
   */
  async search(q: string) {
    return apiClient.get<PaginatedUsers>(`/users/search?q=${encodeURIComponent(q)}`);
  },

  /**
   * Cập nhật thông tin người dùng (email, role)
   */
  async update(user_id: string, payload: UpdateUserPayload) {
    return apiClient.put<User>(`/users/${user_id}`, payload);
  },

  /**
   * Kích hoạt lại tài khoản người dùng
   */
  async activate(user_id: string) {
    return apiClient.patch<User>(`/users/${user_id}/activate`);
  },

  /**
   * Vô hiệu hóa/khóa tài khoản người dùng
   * @param lock_type - 'locked' (tạm thời) hoặc 'deactivated' (vĩnh viễn)
   * @param lock_reason - Lý do khóa
   */
  async deactivate(user_id: string, lock_type: 'locked' | 'deactivated', lock_reason: string) {
    return apiClient.patch<User>(`/users/${user_id}/deactivate`, { lock_type, lock_reason });
  },
};
