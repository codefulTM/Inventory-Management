import { useState, useEffect, useCallback } from "react";
import type { Warehouse, PaginatedWarehouseResponse } from "../types/warehouse";
import warehouseService from "../services/warehouseService";

export const useWarehouseList = (initialPage = 1, initialLimit = 20) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async (p = page, l = limit) => {
    try {
      setLoading(true);
      setError(null);
      const resp: PaginatedWarehouseResponse =
        await warehouseService.fetchWarehouses(p, l);
      setWarehouses(resp.data);
      setTotal(resp.pagination.total);
      setPage(resp.pagination.page);
      setLimitState(resp.pagination.limit);
    } catch (err) {
      const e =
        err instanceof Error ? err : new Error("Failed to fetch warehouses");
      setError(e);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(page, limit);
  }, [page, limit, fetch]);

  const hasNextPage = page * limit < total;
  const hasPreviousPage = page > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) setPage((p) => p + 1);
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) setPage((p) => p - 1);
  }, [hasPreviousPage]);

  const setLimit = useCallback((l: number) => {
    if (l > 0 && l <= 100) {
      setLimitState(l);
      setPage(1);
    }
  }, []);

  const refetch = useCallback(() => fetch(page, limit), [fetch, page, limit]);

  const upsertWarehouse = useCallback((w: Warehouse) => {
    setWarehouses((prev) => {
      const idx = prev.findIndex((x) => x._id === w._id);
      if (idx === -1) {
        setTotal((t) => t + 1);
        return [w, ...prev];
      }
      const next = prev.slice();
      next[idx] = w;
      return next;
    });
  }, []);

  const removeWarehouse = useCallback((id: string) => {
    setWarehouses((prev) => {
      const next = prev.filter((x) => x._id !== id);
      if (next.length !== prev.length) {
        setTotal((t) => Math.max(0, t - 1));
      }
      return next;
    });
  }, []);

  return {
    warehouses,
    total,
    page,
    limit,
    loading,
    error,
    hasNextPage,
    hasPreviousPage,
    refetch,
    nextPage,
    previousPage,
    setLimit,
    upsertWarehouse,
    removeWarehouse,
  };
};
