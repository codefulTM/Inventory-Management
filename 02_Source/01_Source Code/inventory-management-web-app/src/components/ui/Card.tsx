// File: components/ui/Card.tsx
// Component Card và các thành phần con (CardHeader, CardTitle, CardContent, CardFooter)
// Dùng để tạo các khối nội dung có viền, bóng đổ, và tùy chọn hover effect
// Hỗ trợ các mức padding khác nhau: none, sm, md, lg

import type { ReactNode, HTMLAttributes } from 'react';

// Props cho component Card chính
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean; // Có hiệu ứng hover không
  padding?: 'none' | 'sm' | 'md' | 'lg'; // Mức độ padding
}

// Cấu hình padding
const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

// Component Card chính
export function Card({
  children,
  hover = false,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-100 shadow-sm
        transition-all duration-200
        ${hover ? 'hover:shadow-md hover:border-gray-200' : ''}
        ${paddingStyles[padding]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </div>
  );
}

// Component CardHeader - Phần tiêu đề của Card, có thể chứa action button
export function CardHeader({
  children,
  className = '',
  action,
}: {
  children: ReactNode;
  className?: string;
  action?: ReactNode; // Nút hành động (ví dụ: nút Add, Filter)
}) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900">{children}</h3>
      {action && <div>{action}</div>}
    </div>
  );
}

// Component CardTitle - Tiêu đề đơn giản
export function CardTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
}

// Component CardContent - Phần nội dung chính của Card
export function CardContent({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

// Component CardFooter - Phần chân của Card, thường chứa các nút hành động
export function CardFooter({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        mt-4 pt-4 border-t border-gray-100
        flex items-center justify-end gap-3
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </div>
  );
}

export default Card;