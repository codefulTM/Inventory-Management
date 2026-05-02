// File: components/ui/Button.tsx
// Component Button tái sử dụng với nhiều biến thể (variant) và kích thước (size)
// Hỗ trợ trạng thái loading với icon xoay (spinner)
// Sử dụng forwardRef để hỗ trợ ref forwarding

import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

// Các biến thể màu sắc của button
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
// Các kích thước của button
type ButtonSize = 'sm' | 'md' | 'lg';

// Props cho component Button
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; // Biến thể màu sắc
  size?: ButtonSize; // Kích thước
  loading?: boolean; // Trạng thái đang tải
  icon?: React.ReactNode; // Icon hiển thị bên trái text
}

// Định nghĩa styles cho từng biến thể
const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-primary-600 text-white
    hover:bg-primary-700 active:bg-primary-800
    shadow-md shadow-primary-600/20
    hover:shadow-lg hover:shadow-primary-600/30
  `,
  secondary: `
    bg-white text-gray-700 border border-gray-300
    hover:bg-gray-50 active:bg-gray-100
  `,
  ghost: `
    bg-transparent text-gray-600
    hover:bg-gray-100 active:bg-gray-200
  `,
  danger: `
    bg-error-600 text-white
    hover:bg-error-700 active:bg-error-800
    shadow-md shadow-error-600/20
    hover:shadow-lg hover:shadow-error-600/30
  `,
  success: `
    bg-success-600 text-white
    hover:bg-success-700 active:bg-success-800
    shadow-md shadow-success-600/20
    hover:shadow-lg hover:shadow-success-600/30
  `,
};

// Định nghĩa styles cho từng kích thước
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2.5 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-lg',
};

// Component Button chính - Sử dụng forwardRef để hỗ trợ ref
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          font-semibold tracking-wide
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {/* Hiển thị spinner khi loading, hoặc icon nếu có */}
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="w-4 h-4">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;