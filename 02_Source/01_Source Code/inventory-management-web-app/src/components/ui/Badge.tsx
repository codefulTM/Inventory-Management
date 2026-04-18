import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-100 text-success-700 border-success-200',
  warning: 'bg-warning-100 text-warning-700 border-warning-200',
  error: 'bg-error-100 text-error-700 border-error-200',
  info: 'bg-info-100 text-info-700 border-info-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  primary: 'bg-primary-100 text-primary-700 border-primary-200',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-info-500',
  neutral: 'bg-gray-500',
  primary: 'bg-primary-500',
};

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
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />
      )}
      {children}
    </span>
  );
}

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

export function ResultBadge({ result }: { result: string }) {
  const resultMap: Record<string, { variant: BadgeVariant; label: string }> = {
    Pass: { variant: 'success', label: 'Đạt' },
    Fail: { variant: 'error', label: 'Không đạt' },
    Pending: { variant: 'warning', label: 'Chờ' },
  };

  const config = resultMap[result] || { variant: 'neutral' as BadgeVariant, label: result };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

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