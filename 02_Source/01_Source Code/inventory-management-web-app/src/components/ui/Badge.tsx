// File: components/ui/Badge.tsx
// Component Badge hiển thị nhãn trạng thái với nhiều màu sắc khác nhau
// Bao gồm các helper components: StatusBadge, ResultBadge, OrderStatusBadge
//	Dùng để hiển thị trạng thái (status) của các entity trong hệ thống

import type { ReactNode } from 'react';

// Các biến thể màu sắc cho badge
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

// Props cho component Badge
interface BadgeProps {
  variant?: BadgeVariant; // Biến thể màu sắc
  children: ReactNode; // Nội dung bên trong
  className?: string; // Class tùy chỉnh thêm
  dot?: boolean; // Hiển thị chấm tròn nhỏ ở đầu
}

// Styles cho từng biến thể màu
const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-100 text-success-700 border-success-200',
  warning: 'bg-warning-100 text-warning-700 border-warning-200',
  error: 'bg-error-100 text-error-700 border-error-200',
  info: 'bg-info-100 text-info-700 border-info-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  primary: 'bg-primary-100 text-primary-700 border-primary-200',
};

// Styles cho chấm tròn (dot) theo từng biến thể
const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-info-500',
  neutral: 'bg-gray-500',
  primary: 'bg-primary-500',
};

// Component Badge chính
export function Badge({ variant = 'neutral', children, className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1 rounded-full
        text-xs font-semibold
        border transition-colors duration-200
        ${variantStyles[variant]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Hiển thị chấm tròn nếu dot=true */}
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />
      )}
      {children}
    </span>
  );
}

// Component StatusBadge - Hiển thị trạng thái cho Inventory Lot, QC Test, etc.
// Ánh xạ trạng thái tiếng Anh sang tiếng Việt với màu sắc tương ứng
export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
    Quarantine: { variant: 'warning', label: 'Chờ kiểm định' },
    Accepted: { variant: 'success', label: 'Đạt chuẩn' },
    Rejected: { variant: 'error', label: 'Từ chối' },
    Hold: { variant: 'info', label: 'Tạm giữ' },
    Depleted: { variant: 'neutral', label: 'Đã sử dụng' },
    'In Progress': { variant: 'info', label: 'Đang xử lý' },
    Complete: { variant: 'success', label: 'Hoàn thành' },
    Cancelled: { variant: 'neutral', label: 'Đã hủy' },
    Pending: { variant: 'warning', label: 'Chờ duyệt' },
    Approved: { variant: 'success', label: 'Đã duyệt' },
    Pass: { variant: 'success', label: 'Đạt' },
    Fail: { variant: 'error', label: 'Không đạt' },
  };

  const config = statusMap[status] || { variant: 'neutral' as BadgeVariant, label: status };

  return (
    <Badge variant={config.variant} dot className={className}>
      {config.label}
    </Badge>
  );
}

// Component ResultBadge - Hiển thị kết quả kiểm tra (Pass/Fail/Pending)
export function ResultBadge({ result }: { result: string }) {
  const resultMap: Record<string, { variant: BadgeVariant; label: string }> = {
    Pass: { variant: 'success', label: 'Đạt' },
    Fail: { variant: 'error', label: 'Không đạt' },
    Pending: { variant: 'warning', label: 'Chờ' },
  };

  const config = resultMap[result] || { variant: 'neutral' as BadgeVariant, label: result };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Component OrderStatusBadge - Hiển thị trạng thái đơn hàng (Import/Export Order)
export function OrderStatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
    PendingConfirmation: { variant: 'warning', label: 'Chờ xác nhận' },
    Confirmed: { variant: 'info', label: 'Đã xác nhận' },
    InProgress: { variant: 'info', label: 'Đang xử lý' },
    Completed: { variant: 'success', label: 'Hoàn thành' },
    Rejected: { variant: 'error', label: 'Từ chối' },
    Cancelled: { variant: 'neutral', label: 'Đã hủy' },
  };

  const config = statusMap[status] || { variant: 'neutral' as BadgeVariant, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default Badge;