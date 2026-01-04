import { useState, useCallback } from 'react';

interface UsePaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  offset: number;
  setTotal: (total: number) => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 分页管理 Hook
 * 
 * @example
 * ```tsx
 * const pagination = usePagination({ pageSize: 50 });
 * 
 * const fetchData = async () => {
 *   const data = await getVisitStats({
 *     limit: pagination.pageSize,
 *     offset: pagination.offset,
 *   });
 *   pagination.setTotal(data.total);
 *   setVisits(data.items);
 * };
 * ```
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { pageSize = 50, initialPage = 1 } = options;
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(p => p + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  }, [page]);

  const reset = useCallback(() => {
    setPage(initialPage);
    setTotal(0);
  }, [initialPage]);

  return {
    page,
    pageSize,
    total,
    totalPages,
    offset,
    setTotal,
    goToPage,
    nextPage,
    prevPage,
    reset,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

