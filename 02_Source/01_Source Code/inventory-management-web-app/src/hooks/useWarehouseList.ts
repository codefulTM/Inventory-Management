/**
 * Hook useWarehouseList - Quản lý danh sách kho hàng
 * Chức năng: Tự động tải và quản lý danh sách kho với phân trang
 * @param initialPage - Trang bắt đầu (mặc định: 1)
 * @param initialLimit - Số bản ghi mỗi trang (mặc định: 20)
 * @returns warehouses (danh sách), total (tổng), page, limit, loading, error
 * và các hàm: nextPage, previousPage, setLimit, refetch, upsertWarehouse, removeWarehouse
 */
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

  // Hàm tải danh sách kho từ API
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

  // Kiểm tra có trang tiếp theo và trang trước đó không
  const hasNextPage = page * limit < total;
  const hasPreviousPage = page > 1;

  // Chuyển đến trang tiếp theo
  const nextPage = useCallback(() => {
    if (hasNextPage) setPage((p) => p + 1);
  }, [hasNextPage]);

  // Chuyển đến trang trước đó
  const previousPage = useCallback(() => {
    if (hasPreviousPage) setPage((p) => p - 1);
  }, [hasPreviousPage]);

  // Đặt lại số bản ghi mỗi trang (tối đa 100)
  const setLimit = useCallback((l: number) => {
    if (l > 0 && l <= 100) {
      setLimitState(l);
      setPage(1);
    }
  }, []);

  // Tải lại dữ liệu
  const refetch = useCallback(() => fetch(page, limit), [fetch, page, limit]);

  // Thêm mới hoặc cập nhật kho trong danh sách local
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

  // Xóa kho khỏi danh sách local
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
