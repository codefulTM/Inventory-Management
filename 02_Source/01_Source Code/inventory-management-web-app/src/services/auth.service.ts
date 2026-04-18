import { apiClient } from './apiClient';
import type { User } from '../types/auth';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export class AuthService {
  static async login(username: string, password: string) {
    const { data, error } = await apiClient.post<LoginResponse>(
      '/auth/login',
      { username, password },
    );
    return { data, error };
  }

  static async register(username: string, email: string, password: string) {
    const { data, error } = await apiClient.post<RegisterResponse>(
      '/auth/register',
      { username, email, password },
    );
    return { data, error };
  }

  static async logout(refresh_token: string) {
    const { data, error } = await apiClient.post<{ message: string }>(
      '/auth/logout',
      { refresh_token },
    );
    return { data, error };
  }

  static async getMe() {
    const { data, error } = await apiClient.get<User>('/auth/me');
    return { data, error };
  }
}
