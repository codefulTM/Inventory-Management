import { apiClient } from './apiClient';

export type UserRole = 'Manager' | 'Operator' | 'Quality Control Technician' | 'IT Administrator';

export interface User {
  user_id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_date?: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  email?: string;
  role?: UserRole;
}

export interface PaginatedUsers {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const UserService = {
  async getAll(page = 1, limit = 20) {
    return apiClient.get<PaginatedUsers>(`/users?page=${page}&limit=${limit}`);
  },

  async create(payload: CreateUserPayload) {
    return apiClient.post<User>('/users', payload);
  },

  async search(q: string) {
    return apiClient.get<PaginatedUsers>(`/users/search?q=${encodeURIComponent(q)}`);
  },

  async update(user_id: string, payload: UpdateUserPayload) {
    return apiClient.put<User>(`/users/${user_id}`, payload);
  },
};
