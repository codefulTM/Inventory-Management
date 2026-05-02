/**
 * FormField - Component hiển thị một trường form với label và thông báo lỗi
 * Chức năng: Tái sử dụng cho các form thêm/sửa lô hàng
 * Hiển thị label, nội dung (children) và thông báo lỗi (nếu có)
 */
import React from "react";

/** Props cho component FormField */
interface FormFieldProps {
  label: string;           // Nhãn của trường
  error?: string;          // Thông báo lỗi (nếu có)
  children: React.ReactNode; // Nội dung trường (input, select, etc.)
  className?: string;      // Class CSS bổ sung (ví dụ: col-span-2)
}

export function FormField({
  label,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
