import type { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

/* Page wrapper with animation */
export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <div className={`animate-fadeInUp ${className}`}>
      {children}
    </div>
  );
}

/* Container with consistent padding */
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

/* Two column layout */
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

/* Stats grid */
export function StatsGrid({
  children,
  cols = 4,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
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

/* Stat card */
export function StatCard({
  label,
  value,
  change,
  icon,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  change?: string;
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
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

/* Form field */
export function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
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

/* Inline form fields (grid) */
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