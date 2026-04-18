/**
 * Error Handler Utility
 * Xử lý và hiển thị error một cách tổng quát
 */

import { type ApiErrorResponse, ErrorType } from "../types/api";

// Notification/Toast interface (có thể dùng với React Toastify, Sonner, etc)
export interface NotificationOptions {
  message: string;
  type: "error" | "warning" | "success" | "info";
  duration?: number;
  action?: () => void;
}

/**
 * Global notification handler - có thể implement với thư viện notification
 */
let notificationHandler: ((opts: NotificationOptions) => void) | null = null;

export function setNotificationHandler(
  handler: (opts: NotificationOptions) => void,
) {
  notificationHandler = handler;
}

function notify(options: NotificationOptions) {
  if (notificationHandler) {
    notificationHandler(options);
  } else {
    // Fallback: console log
    console.log(`[${options.type.toUpperCase()}]`, options.message);
  }
}

/**
 * Xử lý error dựa vào error type
 * Trả về user-friendly message
 */
export function handleApiError(error: ApiErrorResponse | null): void {
  if (!error) return;

  let message = error.message;
  let type: "error" | "warning" | "info" = "error";

  switch (error.type) {
    case ErrorType.NETWORK_ERROR:
      message =
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet.";
      type = "error";
      break;

    case ErrorType.VALIDATION_ERROR:
      message = error.message || "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
      type = "warning";
      break;

    case ErrorType.UNAUTHORIZED:
      message = "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.";
      type = "warning";
      // Redirect to login handled by API client
      break;

    case ErrorType.FORBIDDEN:
      message = "Bạn không có quyền truy cập tài nguyên này.";
      type = "warning";
      break;

    case ErrorType.NOT_FOUND:
      message = error.message || "Tài nguyên không tồn tại.";
      type = "warning";
      break;

    case ErrorType.SERVER_ERROR:
      message = "Máy chủ gặp lỗi. Vui lòng thử lại sau.";
      type = "error";
      break;

    default:
      message = error.message || "Đã xảy ra lỗi không xác định.";
      type = "error";
  }

  notify({ message, type });
}

/**
 * Log error cho debugging
 */
export function logApiError(error: ApiErrorResponse, context?: string): void {
  console.group(`%c[API Error] ${error.type}`, "color: red; font-weight: bold");

  if (context) console.log("Context:", context);
  console.log("Message:", error.message);
  console.log("Status Code:", error.statusCode);
  console.log("Data:", error.data);
  console.log("Original Error:", error.originalError);

  console.groupEnd();
}

/**
 * Parse validation error từ API response
 * Hữu ích cho form validation
 */
export function parseValidationErrors(
  error: ApiErrorResponse,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (error.type === ErrorType.VALIDATION_ERROR && error.data) {
    if (Array.isArray(error.data)) {
      // Các error format khác nhau từ backend
      error.data.forEach((item: any) => {
        if (item.property && item.constraints) {
          errors[item.property] = Object.values(item.constraints)[0] as string;
        }
      });
    } else if (typeof error.data === "object") {
      // Flat object format
      Object.entries(error.data).forEach(([key, value]) => {
        errors[key] = String(value);
      });
    }
  }

  return errors;
}

/**
 * Retry logic for failed API calls
 */
export async function retryApiCall<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000,
): Promise<T | null> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Attempt ${attempt}/${maxAttempts} failed:`,
        lastError.message,
      );

      if (attempt < maxAttempts) {
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`All ${maxAttempts} attempts failed:`, lastError?.message);
  return null;
}

/**
 * Check if error is recoverable (user can retry)
 */
export function isRecoverableError(error: ApiErrorResponse): boolean {
  return (
    error.type === ErrorType.NETWORK_ERROR ||
    error.statusCode === 408 || // Request Timeout
    error.statusCode === 429 || // Too Many Requests
    (error.statusCode !== undefined && error.statusCode >= 500) // Server errors
  );
}

/**
 * Format error message with status code
 */
export function formatErrorMessage(error: ApiErrorResponse): string {
  if (error.statusCode) {
    return `[${error.statusCode}] ${error.message}`;
  }
  return error.message;
}
