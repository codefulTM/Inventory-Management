// File: components/error/ErrorBoundary.tsx
// React Class Component bắt lỗi (Error Boundary) cho toàn bộ ứng dụng
// Khi có lỗi xảy ra trong component tree, sẽ hiển thị ErrorMessage thay vì crash app
// Tự động bắt lỗi JavaScript và hiển thị UI dự phòng (fallback UI)

import { Component, type ErrorInfo, type ReactNode } from 'react';
import ErrorMessage from './ErrorMessage';

// Props cho ErrorBoundary
type ErrorBoundaryProps = {
  children: ReactNode;
};

// State lưu trạng thái lỗi
type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

// ErrorBoundary class component
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  // Khởi tạo state mặc định
  public state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  // Phương thức tĩnh: Được gọi khi có lỗi xảy ra, trả về state mới
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected UI error',
    };
  }

  // Ghi log lỗi ra console khi bắt được lỗi
  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  // Xử lý retry: Reset state để thử lại render children
  private handleRetry = (): void => {
    this.setState({ hasError: false, message: '' });
  };

  // Render: Nếu có lỗi thì hiển thị ErrorMessage, ngược lại render children bình thường
  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorMessage
          title="Lỗi ứng dụng"
          message={this.state.message}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
