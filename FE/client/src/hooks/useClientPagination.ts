import { useCallback, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;

export function useClientPagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPageState] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), pageCount);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const setPage = useCallback(
    (p: number) => setPageState(Math.min(Math.max(1, p), Math.max(1, Math.ceil(items.length / pageSize) || 1))),
    [items.length, pageSize]
  );

  const resetPage = useCallback(() => setPageState(1), []);

  return {
    page: safePage,
    pageSize,
    pageCount,
    total,
    pageItems,
    setPage,
    resetPage,
  };
}
