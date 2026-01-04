import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  interval?: number; // 毫秒
  onRefresh: () => void | Promise<void>;
}

interface UseAutoRefreshReturn {
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

/**
 * 自动刷新 Hook
 * 
 * @example
 * ```tsx
 * const { refresh, isRefreshing } = useAutoRefresh({
 *   enabled: true,
 *   interval: 15000, // 15秒
 *   onRefresh: fetchKPIs,
 * });
 * 
 * // 手动刷新
 * <button onClick={refresh}>刷新</button>
 * ```
 */
export function useAutoRefresh(options: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const { enabled = true, interval = 30000, onRefresh } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 立即执行一次
    refresh();

    // 设置定时刷新
    intervalRef.current = setInterval(refresh, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, refresh]);

  return { refresh, isRefreshing };
}

