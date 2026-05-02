// File: components/ui/Layout.tsx
// Các component layout tái sử dụng: PageWrapper, PageContainer, TwoColumn, StatsGrid, StatCard, FormField, FormRow
// Giúp cấu trúc hóa giao diện nhất quán across toàn bộ ứng dụng

import type { ReactNode } from 'react';

// Props cho PageWrapper - Bọc toàn bộ page với animation
interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

// Component bọc page với hiệu ứng fade-in-up animation
export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <div className={`animate-fadeInUp ${className}`}>
      {children}
    </div>
  );
}

// Component container có padding nhất quán
export function PageContainer({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

// Component layout 2 cột (trái phải) - Responsive: 1 cột trên mobile, 3 cột trên desktop
export function TwoColumn({
  left,
  right,
  className = '',
}: {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-6 ${right ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'} ${className}`}>
      <div className={right ? 'lg:col-span-2' : ''}>
        {left}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

// Component grid hiển thị thống kê (stats)
export function StatsGrid({
  children,
  cols = 4,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4; // Số cột: 2, 3, hoặc 4
}) {
  const colsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${colsClass[cols]} gap-4`}>
      {children}
    </div>
  );
}

// Component thẻ thống kê (Stat Card) - Hiển thị chỉ số, giá trị, và icon
export function StatCard({
  label,
  value,
  change,
  icon,
  variant = 'default',
}: {
  label: string; // Nhãn (ví dụ: "Tổng hàng tồn")
  value: string | number; // Giá trị hiển thị
  change?: string; // Thay đổi (ví dụ: "+12% so với tháng trước")
  icon?: ReactNode; // Icon biểu tượng
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'; // Màu sắc
}) {
  const variants = {
    default: 'border-gray-100',
    success: 'border-success-200 bg-success-50/50',
    warning: 'border-warning-200 bg-warning-50/50',
    error: 'border-error-200 bg-error-50/50',
    info: 'border-info-200 bg-info-50/50',
  };

  const iconVariants = {
    default: 'text-gray-400',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
    info: 'text-info-600',
  };

  return (
    <div
      className={`
        bg-white rounded-xl border p-5 transition-all duration-200
        hover:shadow-md
        ${variants[variant]}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className="text-sm text-gray-500 mt-1">{change}</p>
          )}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg bg-gray-50 ${iconVariants[variant]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Component FormField - Bọc label, input, và error message
export function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string; // Nhãn trường
  error?: string; // Thông báo lỗi
  required?: boolean; // Có bắt buộc không
  children: ReactNode; // Input element
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-error-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-error-600 mt-1">{error}</p>
      )}
    </div>
  );
}

// Component FormRow - Layout grid cho form (2 cột)
export function FormRow({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {children}
    </div>
  );
}

export default PageWrapper;