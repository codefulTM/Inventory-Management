/**
 * API Response Types
 * Định nghĩa các type chung cho API responses
 */

/**
 * Response tiêu chuẩn từ backend API
 * Wrapper cho tất cả responses với success flag và optional data/error
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
  statusCode?: number;
}

/**
 * Response phân trang - dùng cho các API trả về danh sách
 */
export interface PaginatedResponse<T = any> {
  items: T[];          // Danh sách items trong trang hiện tại
  total: number;       // Tổng số items
  page: number;        // Trang hiện tại
  limit: number;       // Số items mỗi trang
  totalPages: number;  // Tổng số trang
}

/**
 * Chi tiết lỗi từ API
 */
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: Record<string, any>;
  timestamp?: string;
}

/**
 * Tùy chọn khi gửi request HTTP
 */
export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, any>;    // Query parameters
  timeout?: number;
  validateStatus?: (status: number) => boolean;
}

/**
 * Các loại lỗi API - dùng để phân loại và xử lý error
 */
export const ErrorType = {
  NETWORK_ERROR: "NETWORK_ERROR",      // Lỗi kết nối mạng
  VALIDATION_ERROR: "VALIDATION_ERROR", // Lỗi validation (400)
  UNAUTHORIZED: "UNAUTHORIZED",         // Không có quyền truy cập (401)
  FORBIDDEN: "FORBIDDEN",               // Bị từ chối (403)
  NOT_FOUND: "NOT_FOUND",               // Không tìm thấy (404)
  SERVER_ERROR: "SERVER_ERROR",         // Lỗi server (5xx)
  UNKNOWN_ERROR: "UNKNOWN_ERROR",       // Lỗi không xác định
} as const;
export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];

/**
 * Response lỗi đã được parse từ ApiClient
 */
export interface ApiErrorResponse {
  type: ErrorType;        // Loại lỗi
  message: string;        // Thông báo lỗi
  statusCode?: number;    // HTTP status code
  data?: any;             // Dữ liệu lỗi chi tiết
  originalError?: Error;  // Lỗi gốc từ axios
}
