import { AlertCircle, Loader } from "lucide-react";

interface LoadingAndErrorProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function LoadingAndError({
  isLoading,
  error,
  onRetry,
}: LoadingAndErrorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-xl border border-gray-100">
        <Loader className="animate-spin text-blue-500 mr-2" size={24} />
        <span className="text-gray-600">Đang tải dữ liệu...</span>
      </div>
    );
  }

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

  return null;
}
