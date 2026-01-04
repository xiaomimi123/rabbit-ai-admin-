import React from 'react';
import { Loader2 } from 'lucide-react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 统一的操作按钮组件
 * 提供加载状态、不同样式变体
 * 
 * @example
 * ```tsx
 * <ActionButton
 *   variant="primary"
 *   loading={isSubmitting}
 *   onClick={handleSubmit}
 * >
 *   提交
 * </ActionButton>
 * ```
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  loading = false,
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-lg';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const variantStyles = {
    primary: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/10',
    danger: 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/10',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700',
    ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
          {size === 'lg' ? '处理中...' : '处理中'}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

