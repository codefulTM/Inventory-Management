/**
 * useMaterialList Hook
 * Custom hook quản lý danh sách nguyên liệu với phân trang
 * Tự động fetch dữ liệu khi page hoặc limit thay đổi
 * Cung cấp các hàm: nextPage, previousPage, goToPage, setLimit, refetch
 */

import { useState, useEffect, useCallback } from "react";
import type { Material, PaginatedMaterialResponse } from "../types/material";
import { materialService } from "../services/material.service";

/**
 * Interface trả về từ useMaterialList hook
 */
interface UseMaterialListReturn {
  materials: Material[];          // Danh sách nguyên liệu
  total: number;                  // Tổng số nguyên liệu
  page: number;                   // Trang hiện tại
  limit: number;                  // Số items mỗi trang
  loading: boolean;               // Đang tải dữ liệu
  error: Error | null;            // Lỗi (nếu có)
  hasNextPage: boolean;           // Còn trang sau không
  hasPreviousPage: boolean;       // Còn trang trước không
  refetch: () => void;            // Tải lại dữ liệu
  nextPage: () => void;           // Chuyển trang sau
  previousPage: () => void;       // Chuyển trang trước
  goToPage: (page: number) => void; // Nhảy đến trang cụ thể
  setLimit: (limit: number) => void; // Đặt số items mỗi trang
}

/**
 * Hook quản lý danh sách nguyên liệu phân trang
 * @param initialPage - Trang ban đầu (mặc định: 1)
 * @param initialLimit - Số items mỗi trang ban đầu (mặc định: 20)
 */
export const useMaterialList = (
  initialPage: number = 1,
  initialLimit: number = 20,
): UseMaterialListReturn => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMaterials = useCallback(
    async (p: number = page, l: number = limit) => {
      try {
        setLoading(true);
        setError(null);
        const response: PaginatedMaterialResponse =
          await materialService.findAll(p, l);
        setMaterials(response.data);
        setTotal(response.pagination.total);
        setPage(response.pagination.page);
        setLimitState(response.pagination.limit);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to fetch materials");
        setError(error);
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchMaterials(page, limit);
  }, [page, limit, fetchMaterials]);

  const hasNextPage = page * limit < total;
  const hasPreviousPage = page > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage((p) => p + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage((p) => p - 1);
    }
  }, [hasPreviousPage]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1) {
      setPage(newPage);
    }
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    if (newLimit > 0 && newLimit <= 100) {
      setLimitState(newLimit);
      setPage(1); // Reset to first page when limit changes
    }
  }, []);

  const refetch = useCallback(() => {
    fetchMaterials(page, limit);
  }, [fetchMaterials, page, limit]);

  return {
    materials,
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
    goToPage,
    setLimit,
  };
};
