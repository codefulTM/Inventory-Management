/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Client
 * Wrapper tái sử dụng với error handling tổng quát
 */

import axios, { type AxiosInstance, AxiosError } from "axios";
import {
  type ApiResponse,
  type FetchOptions,
  type ApiErrorResponse,
  ErrorType,
} from "../types/api";

// API config từ environment
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const API_TIMEOUT = 30000;

// ───── Token & Auth Utilities ─────────────────────────────────────────────────
/**
 * Validate token format và kiểm tra hết hạn
 */
export function isTokenValid(): boolean {
  const token = localStorage.getItem("auth_token");
  if (!token) return false;

  try {
    // Decode JWT payload (without verification)
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const decoded = JSON.parse(atob(parts[1]));
    const exp = decoded.exp;

    // Check if token expired
    if (exp && exp * 1000 < Date.now()) {
      localStorage.removeItem("auth_token");
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get current user info từ localStorage
 */
export function getCurrentUser(): {
  user_id?: string;
  role?: string;
  username?: string;
} | null {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Get user role
 */
export function getCurrentUserRole(): string | null {
  const user = getCurrentUser();
  return user?.role || null;
}

/**
 * Check if user has required role(s)
 */
export function hasPermission(requiredRoles: string | string[]): boolean {
  const userRole = getCurrentUserRole();
  if (!userRole) return false;

  if (typeof requiredRoles === "string") {
    return userRole === requiredRoles;
  }

  return requiredRoles.includes(userRole);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return isTokenValid();
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
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor - thêm token auth + user info
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Không require token cho auth endpoints
        const isAuthEndpoint = config.url?.includes("/auth/");

        // Thêm Authorization header với token (ngoại trừ auth endpoints)
        const token = localStorage.getItem("auth_token");
        if (token && !isAuthEndpoint) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log(
            `[API] Request to ${config.url} - Token added:`,
            token.substring(0, 20) + "...",
          );
        } else if (!isAuthEndpoint && !token) {
          console.warn(`[API] Request to ${config.url} - NO TOKEN FOUND!`);
        } else if (isAuthEndpoint) {
          console.log(`[API] Auth endpoint ${config.url} - Skipping token`);
        }

        // Thêm user role info vào header (optional, để backend dễ check)
        const user = getCurrentUser();
        if (user?.role) {
          config.headers["X-User-Role"] = user.role;
          console.log(`[API] X-User-Role header set to:`, user.role);
        }
        if (user?.user_id) {
          config.headers["X-User-Id"] = user.user_id;
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor - xử lý error tổng quát
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // Không redirect tự động cho auth endpoints (login, register, logout)
        // Để cho component xử lý error message
        const url = error.config?.url || "";
        const isAuthEndpoint = url.includes("/auth/");

        // Nếu token hết hạn hoặc unauthorized, redirect to login (chỉ cho non-auth requests)
        if (error.response?.status === 401 && !isAuthEndpoint) {
          console.error(`[API] 401 Unauthorized - Token invalid or expired`);
          console.error(`[API] Response:`, error.response?.data);
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }

        // Nếu forbidden (role không phù hợp), chỉ log lỗi, KHÔNG redirect (tránh vòng lặp reload)
        if (error.response?.status === 403) {
          console.error(`[API] 403 Forbidden - Insufficient role`);
          console.error(`[API] Response:`, error.response?.data);
          // Không redirect, chỉ log lỗi
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Phân loại error type dựa vào HTTP status code
   */
  private getErrorType(statusCode?: number): ErrorType {
    switch (statusCode) {
      case 400:
        return ErrorType.VALIDATION_ERROR;
      case 401:
        return ErrorType.UNAUTHORIZED;
      case 403:
        return ErrorType.FORBIDDEN;
      case 404:
        return ErrorType.NOT_FOUND;
      case 500:
      case 502:
      case 503:
      case 504:
        return ErrorType.SERVER_ERROR;
      default:
        return ErrorType.UNKNOWN_ERROR;
    }
  }

  /**
   * Parse error response từ API hoặc network error
   */
  private parseError(error: AxiosError | Error): ApiErrorResponse {
    const axiosError = error as AxiosError<any>;

    if (axiosError.response) {
      // API returned error response
      const statusCode = axiosError.response.status;
      const responseData = axiosError.response.data;

      return {
        type: this.getErrorType(statusCode),
        statusCode,
        message:
          responseData?.message ||
          responseData?.error ||
          axiosError.message ||
          "An error occurred",
        data: responseData?.details || responseData,
        originalError: axiosError,
      };
    } else if (axiosError.request) {
      // Request made but no response
      return {
        type: ErrorType.NETWORK_ERROR,
        message:
          "No response from server. Please check your internet connection.",
        originalError: axiosError,
      };
    } else {
      // Error during request setup
      return {
        type: ErrorType.UNKNOWN_ERROR,
        message: error.message || "An unknown error occurred",
        originalError: error,
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    options?: FetchOptions,
  ): Promise<
    { data: T; error: null } | { data: null; error: ApiErrorResponse }
  > {
    try {
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, {
        params: options?.params,
        headers: options?.headers,
        timeout: options?.timeout,
      });

      // Nếu response.data.data không tồn tại, trả về response.data (hỗ trợ cả 2 kiểu API)
      return {
        data:
          response.data &&
          typeof response.data === "object" &&
          "data" in response.data
            ? (response.data.data as T)
            : (response.data as T),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: this.parseError(error as Error),
      };
    }
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    payload?: any,
    options?: FetchOptions,
  ): Promise<
    { data: T; error: null } | { data: null; error: ApiErrorResponse }
  > {
    try {
      const response = await this.axiosInstance.post<ApiResponse<T> | T>(
        url,
        payload,
        {
          params: options?.params,
          headers: options?.headers,
          timeout: options?.timeout,
        },
      );

      // Handle both wrapped response {data: {...}} and direct response {...}
      const responseData = (response.data as any).data ?? response.data;
      return {
        data: responseData as T,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: this.parseError(error as Error),
      };
    }
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    payload?: any,
    options?: FetchOptions,
  ): Promise<
    { data: T; error: null } | { data: null; error: ApiErrorResponse }
  > {
    try {
      const response = await this.axiosInstance.put<ApiResponse<T> | T>(
        url,
        payload,
        {
          params: options?.params,
          headers: options?.headers,
          timeout: options?.timeout,
        },
      );

      // Handle both wrapped response {data: {...}} and direct response {...}
      const responseData = (response.data as any).data ?? response.data;
      return {
        data: responseData as T,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: this.parseError(error as Error),
      };
    }
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    options?: FetchOptions,
  ): Promise<
    { data: T; error: null } | { data: null; error: ApiErrorResponse }
  > {
    try {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url, {
        params: options?.params,
        headers: options?.headers,
        timeout: options?.timeout,
      });

      return {
        data: response.data.data as T,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: this.parseError(error as Error),
      };
    }
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    payload?: any,
    options?: FetchOptions,
  ): Promise<
    { data: T; error: null } | { data: null; error: ApiErrorResponse }
  > {
    try {
      const response = await this.axiosInstance.patch<ApiResponse<T>>(
        url,
        payload,
        {
          params: options?.params,
          headers: options?.headers,
          timeout: options?.timeout,
        },
      );

      return {
        data: response.data.data as T,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: this.parseError(error as Error),
      };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class để có thể extend hoặc custom
export default ApiClient;
