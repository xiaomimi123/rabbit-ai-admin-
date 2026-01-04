import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  type?: 'spinner' | 'skeleton' | 'dots';
  message?: string;
  fullScreen?: boolean;
}

/**
 * 统一的加载组件
 * 
 * @example
 * ```tsx
 * <Loading type="spinner" message="加载中..." />
 * <Loading type="skeleton" />
 * ```
 */
export const Loading: React.FC<LoadingProps> = ({ 
  type = 'spinner', 
  message = '加载中...',
  fullScreen = false,
}) => {
  if (type === 'skeleton') {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-zinc-900 rounded-xl border border-zinc-800" />
        <div className="h-32 bg-zinc-900 rounded-xl border border-zinc-800" />
        <div className="h-32 bg-zinc-900 rounded-xl border border-zinc-800" />
      </div>
    );
  }

  if (type === 'dots') {
    return (
      <div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen' : 'p-8'}`}>
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? 'min-h-screen' : 'p-8'}`}>
      <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
      <p className="text-zinc-400 text-sm">{message}</p>
    </div>
  );
};

/**
 * 表格骨架屏组件
 * 
 * @example
 * ```tsx
 * <TableSkeleton rows={5} />
 * ```
 */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5,
  cols = 4,
}) => {
  return (
    <div className="animate-pulse space-y-3">
      {/* 表头 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-zinc-900 rounded border border-zinc-800" />
        ))}
      </div>
      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-12 bg-zinc-900 rounded-lg border border-zinc-800" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * 卡片骨架屏组件
 * 
 * @example
 * ```tsx
 * <CardSkeleton count={4} />
 * ```
 */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse" />
      ))}
    </div>
  );
};

