// === apiClient.ts ===
// HTTP client wrapper cho React frontend (axios)
// Key methods: get, post, put, delete, patch; isTokenValid, getCurrentUser, hasPermission
// API: Gọi backend tại VITE_API_URL, xử lý auth token, error handling

import axios, { type AxiosInstance, AxiosError } from "axios";
import { type ApiResponse, type FetchOptions, type ApiErrorResponse, ErrorType } from "../types/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const API_TIMEOUT = 30000;

/**
 * Validate token format và kiểm tra hết hạn
 */
export function isTokenValid(): boolean {
  // [SKELETON: Get token from localStorage → Decode JWT payload → Check expiration → Return valid flag]
}

/**
 * Get current user info từ localStorage
 */
export function getCurrentUser(): { user_id?: string; role?: string; username?: string } | null {
  // [SKELETON: Get user from localStorage → Parse JSON → Return user object or null]
}

/**
 * Get user role
 */
export function getCurrentUserRole(): string | null {
  // [SKELETON: Get current user → Return role or null]
}

/**
 * Check if user has required role(s)
 */
export function hasPermission(requiredRoles: string | string[]): boolean {
  // [SKELETON: Get user role → Check against requiredRoles → Return boolean]
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  // [SKELETON: Check token validity → Return boolean]
}

/**
 * API Client class
 * Quản lý tất cả HTTP requests với error handling tổng quát
 */
class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL = API_BASE_URL) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: API_TIMEOUT,
      headers: { "Content-Type": "application/json" },
    });

    // Request interceptor - thêm token auth + user info
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // [SKELETON: Check if auth endpoint → Add Authorization header with token → Add X-User-Role and X-User-Id headers → Return config]
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor - xử lý error tổng quát
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // [SKELETON: Check if auth endpoint → If 401: clear token and redirect to login → If 403: log error → Return Promise.reject(error)]
      },
    );
  }

  /**
   * Phân loại error type dựa vào HTTP status code
   */
  private getErrorType(statusCode?: number): ErrorType {
    // [SKELETON: Map status code to ErrorType → Return ErrorType]
  }

  /**
   * Parse error response từ API hoặc network error
   */
  private parseError(error: AxiosError | Error): ApiErrorResponse {
    // [SKELETON: Extract status code and response data → Build ApiErrorResponse with type, message, data → Return error object]
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    options?: FetchOptions,
  ): Promise<{ data: T; error: null } | { data: null; error: ApiErrorResponse }> {
    // [SKELETON: Call axios.get → Handle wrapped response → Return {data, error}]
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    payload?: any,
    options?: FetchOptions,
  ): Promise<{ data: T; error: null } | { data: null; error: ApiErrorResponse }> {
    // [SKELETON: Call axios.post → Handle both wrapped and direct response → Return {data, error}]
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    payload?: any,
    options?: FetchOptions,
  ): Promise<{ data: T; error: null } | { data: null; error: ApiErrorResponse }> {
    // [SKELETON: Call axios.put → Handle both wrapped and direct response → Return {data, error}]
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    options?: FetchOptions,
  ): Promise<{ data: T; error: null } | { data: null; error: ApiErrorResponse }> {
    // [SKELETON: Call axios.delete → Return {data, error}]
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    payload?: any,
    options?: FetchOptions,
  ): Promise<{ data: T; error: null } | { data: null; error: ApiErrorResponse }> {
    // [SKELETON: Call axios.patch → Return {data, error}]
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class để có thể extend hoặc custom
export default ApiClient;