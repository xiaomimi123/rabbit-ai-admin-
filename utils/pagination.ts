/**
 * 客户端分页工具函数
 */
export function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number
): {
  paginatedData: T[];
  totalPages: number;
  currentPage: number;
  total: number;
} {
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  return {
    paginatedData,
    totalPages,
    currentPage: page,
    total,
  };
}

