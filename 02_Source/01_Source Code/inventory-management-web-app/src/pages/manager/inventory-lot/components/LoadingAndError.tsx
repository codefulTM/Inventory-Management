/**
 * LoadingAndError - Component hiển thị trạng thái tải hoặc lỗi
 * Chức năng: Hiển thị spinner khi đang tải dữ liệu
 * Hiển thị thông báo lỗi và nút thử lại khi có lỗi
 * Không hiển thị gì nếu không tải và không lỗi
 */
import { AlertCircle, Loader } from "lucide-react";

/** Props cho component LoadingAndError */
interface LoadingAndErrorProps {
  isLoading: boolean;      // Đang tải dữ liệu hay không
  error: string | null;    // Thông báo lỗi (null nếu không có)
  onRetry: () => void;    // Hàm thử lại khi có lỗi
}

/** Component chính: Hiển thị trạng thái tải hoặc lỗi */
export function LoadingAndError({
  isLoading,
  error,
  onRetry,
}: LoadingAndErrorProps) {
  // Hiển thị spinner khi đang tải
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-xl border border-gray-100">
        <Loader className="animate-spin text-blue-500 mr-2" size={24} />
        <span className="text-gray-600">Đang tải dữ liệu...</span>
      </div>
    );
  }

  // Hiển thị thông báo lỗi và nút thử lại
  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <AlertCircle className="text-red-600" size={20} />
        <div className="flex-1">
          <p className="text-red-800 font-medium">{error}</p>
          <button
            onClick={onRetry}
            className="text-red-600 hover:text-red-700 font-medium underline"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }
  // Không hiển thị gì nếu không tải và không lỗi
  return null;
}
