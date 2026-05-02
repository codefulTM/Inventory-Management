// File: components/Toast.tsx
// Component hiển thị thông báo nhanh (toast notification)
// Tự động đóng sau 4 giây
// Dùng để thông báo kết quả thao tác (thành công/thất bại)

import { useEffect } from "react";

// Props cho Toast
interface Props {
  message: string; // Nội dung thông báo
  type: "success" | "error"; // Loại thông báo (thành công/thất bại)
  onClose: () => void; // Callback khi đóng toast
}

export default function Toast({ message, type, onClose }: Props) {
  // Tự động đóng toast sau 4 giây
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm flex items-center gap-3 ${
        type === "success" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {/* Icon thành công (✓) hoặc thất bại (✕) */}
      <span>{type === "success" ? "✓" : "✕"}</span>
      <span>{message}</span>
      {/* Nút đóng thủ công */}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        ×
      </button>
    </div>
  );
}
