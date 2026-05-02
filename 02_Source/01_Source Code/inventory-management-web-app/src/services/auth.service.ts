/**
 * Auth Service
 * Service xử lý các tác vụ xác thực: đăng nhập, đăng ký, đăng xuất, lấy thông tin user
 * Giao tiếp với backend API thông qua apiClient
 */

import { apiClient } from './apiClient';
import type { User } from '../types/auth';

/**
 * Response trả về sau khi đăng nhập thành công
 * Bao gồm access token, refresh token và thông tin user
 */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
}

/**
 * Response trả về sau khi đăng ký thành công
 */
export interface RegisterResponse {
  message: string;
  user: User;
}

/**
 * AuthService - Class tĩnh chứa các phương thức xác thực
 * Tất cả phương thức đều trả về { data, error } để caller xử lý
 */
export class AuthService {
  /**
   * Đăng nhập với username và password
   * @param username - Tên đăng nhập
   * @param password - Mật khẩu
   * @returns LoginResponse chứa tokens và user info
   */
  static async login(username: string, password: string) {
    const { data, error } = await apiClient.post<LoginResponse>(
      '/auth/login',
      { username, password },
    );
    return { data, error };
  }

  /**
   * Đăng ký tài khoản mới
   * @param username - Tên đăng nhập
   * @param email - Email
   * @param password - Mật khẩu
   * @returns RegisterResponse chứa thông tin user mới tạo
   */
  static async register(username: string, email: string, password: string) {
    const { data, error } = await apiClient.post<RegisterResponse>(
      '/auth/register',
      { username, email, password },
    );
    return { data, error };
  }

  /**
   * Đăng xuất - thu hồi refresh token ở backend
   * @param refresh_token - Refresh token cần thu hồi
   * @returns Kết quả logout từ server
   */
  static async logout(refresh_token: string) {
    const { data, error } = await apiClient.post<{ message: string }>(
      '/auth/logout',
      { refresh_token },
    );
    return { data, error };
  }

  /**
   * Lấy thông tin user hiện tại
   * @returns Thông tin chi tiết của user đang đăng nhập
   */
  static async getMe() {
    const { data, error } = await apiClient.get<User>('/auth/me');
    return { data, error };
  }
}
