// File: components/error/ErrorMessage.tsx
// Component hiển thị thông báo lỗi cho người dùng
// Thường được sử dụng bên trong ErrorBoundary để hiển thị UI dự phòng khi có lỗi

type ErrorMessageProps = {
  title?: string; // Tiêu đề lỗi (mặc định: "Something went wrong")
  message: string; // Nội dung chi tiết lỗi
  onRetry?: () => void; // Hàm xử lý khi người dùng nhấn nút Retry
};

// Component hiển thị thông báo lỗi với nút thử lại (nếu có)
export default function ErrorMessage({
  title = 'Có lỗi xảy ra',
  message,
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="mx-auto my-6 max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      {/* Tiêu đề lỗi */}
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide">{title}</h3>
      {/* Nội dung lỗi */}
      <p className="text-sm">{message}</p>
      {/* Nút thử lại - chỉ hiển thị khi có onRetry */}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded bg-red-700 px-3 py-1 text-sm font-medium text-white hover:bg-red-800"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}
