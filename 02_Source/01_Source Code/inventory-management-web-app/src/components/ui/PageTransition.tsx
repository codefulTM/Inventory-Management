// File: components/ui/PageTransition.tsx
// Các component hỗ trợ hiệu ứng chuyển trang và loading skeleton
// Bao gồm: PageTransition, StaggerList, LoadingSkeleton, EmptyState, SectionHeading, PageHeader
// Dùng để tạo UX mượt mà khi chuyển trang hoặc đang tải dữ liệu

import type { ReactNode } from 'react';

// Props cho PageTransition
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Component bọc page với hiệu ứng fade-in-up animation
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <div
      className={`
        animate-fadeInUp
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Component hiển thị children với hiệu ứng stagger (lần lượt từng phần tử)
export function StaggerList({
  children,
  className = '',
  delay = 'fast',
}: {
  children: ReactNode;
  className?: string;
  delay?: 'normal' | 'fast'; // Tốc độ delay giữa các phần tử
}) {
  const delayClass = delay === 'fast' ? 'stagger-item-fast' : 'stagger-item';

  // Chuyển children thành array để map
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <div className={className}>
      {childArray.map((child, index) => (
        <div
          key={index}
          className={delayClass}
          style={{ animationDelay: `${index * (delay === 'fast' ? 30 : 50)}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// Component hiển thị skeleton loading (placeholder khi đang tải)
export function LoadingSkeleton({
  className = '',
  variant = 'text',
}: {
  className?: string;
  variant?: 'text' | 'circle' | 'rect' | 'card'; // Hình dạng skeleton
}) {
  const variantStyles = {
    text: 'h-4 w-3/4 rounded',
    circle: 'w-10 h-10 rounded-full',
    rect: 'h-20 w-full rounded-lg',
    card: 'h-32 w-full rounded-xl',
  };

  return (
    <div
      className={`
        bg-gray-200 animate-pulse rounded
        ${variantStyles[variant]}
        ${className}
      `}
    />
  );
}

// Component skeleton cho bảng (table)
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number; // Số hàng
  columns?: number; // Số cột
}) {
  return (
    <div className="space-y-3 p-4">
      {/* Header skeleton */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <LoadingSkeleton key={i} variant="text" className="flex-1" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton key={colIndex} variant="text" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Component skeleton cho Card
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
      <LoadingSkeleton variant="text" className="w-1/2" />
      <LoadingSkeleton variant="text" className="w-3/4" />
      <LoadingSkeleton variant="text" className="w-1/4" />
    </div>
  );
}

// Component skeleton cho StatCard
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
      <LoadingSkeleton variant="text" className="w-20" />
      <LoadingSkeleton variant="text" className="w-16 h-8" />
      <LoadingSkeleton variant="text" className="w-24" />
    </div>
  );
}

// Component hiển thị trạng thái rỗng (không có dữ liệu)
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode; // Icon minh họa
  title: string; // Tiêu đề
  description?: string; // Mô tả
  action?: ReactNode; // Nút hành động (ví dụ: "Thêm mới")
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

// Component tiêu đề section (có thể chứa action button)
export function SectionHeading({
  children,
  className = '',
  action,
}: {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <h2 className="text-xl font-bold text-gray-900">{children}</h2>
      {action && <div>{action}</div>}
    </div>
  );
}

// Component header của page (tiêu đề chính + subtitle + actions)
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export default PageTransition;