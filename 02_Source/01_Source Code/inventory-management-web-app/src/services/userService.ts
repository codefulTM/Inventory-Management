import { apiClient } from './apiClient';

export type UserRole =
  | 'Manager'
  | 'Operator'
  | 'Quality Control Technician'
  | 'IT Administrator';

export interface UserItem {
  user_id: string;
  keycloak_id?: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_date?: string;
  modified_date?: string;
}

export interface PaginatedUsers {
  data: UserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateUserPayload {
  username: string;
  email: string;
  role?: UserRole;
}

export interface UpdateUserPayload {
  email?: string;
  role?: UserRole;
  is_active?: boolean;
}

function unwrapOrThrow<T>(
  data: T | null,
  error: { message?: string } | null,
  fallback: string,
): T {
  if (error) {
    throw new Error(error.message || fallback);
  }
  if (!data) {
    throw new Error(fallback);
  }
  return data;
}

export async function listUsers(
  page = 1,
  limit = 20,
): Promise<PaginatedUsers> {
  const { data, error } = await apiClient.get<PaginatedUsers>('/users', {
    params: { page, limit },
  });
  return unwrapOrThrow(data, error, 'Unable to load users');
}

export async function searchUsers(
  query: string,
  page = 1,
  limit = 20,
): Promise<PaginatedUsers> {
  const { data, error } = await apiClient.get<PaginatedUsers>('/users/search', {
    params: { q: query, page, limit },
  });
  return unwrapOrThrow(data, error, 'Unable to search users');
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<UserItem> {
  const { data, error } = await apiClient.post<UserItem>('/users', payload);
  return unwrapOrThrow(data, error, 'Unable to create user');
}

export async function updateUser(
  userId: string,
  payload: UpdateUserPayload,
): Promise<UserItem> {
  const { data, error } = await apiClient.put<UserItem>(`/users/${userId}`, payload);
  return unwrapOrThrow(data, error, 'Unable to update user');
}
