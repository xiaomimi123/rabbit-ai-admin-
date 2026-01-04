import React from 'react';
import { Inbox, Search, Database, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'search' | 'database' | 'error';
}

/**
 * 空状态组件
 * 用于显示列表为空、搜索无结果等情况
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   title="暂无数据"
 *   description="还没有任何访问记录"
 *   action={<button>刷新</button>}
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  variant = 'default',
}) => {
  // 根据 variant 选择默认图标
  const getDefaultIcon = () => {
    switch (variant) {
      case 'search':
        return <Search size={48} className="text-zinc-500" />;
      case 'database':
        return <Database size={48} className="text-zinc-500" />;
      case 'error':
        return <AlertCircle size={48} className="text-red-500" />;
      default:
        return <Inbox size={48} className="text-zinc-500" />;
    }
  };

  const displayIcon = icon || getDefaultIcon();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-4">{displayIcon}</div>
      <h3 className="text-lg font-semibold text-zinc-300 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-500 text-center max-w-md mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

