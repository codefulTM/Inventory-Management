/**
 * useMaterialSearch Hook
 * Custom hook tìm kiếm nguyên liệu với debounce
 * Hỗ trợ: tìm kiếm theo từ khóa, lọc theo loại, phân trang
 * Debounce: chờ 500ms (mặc định) sau khi ngừng gõ mới gọi API
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  Material,
  PaginatedMaterialResponse,
  MaterialType,
} from "../types/material";
import { materialService } from "../services/material.service";

/**
 * Interface trả về từ useMaterialSearch hook
 */
interface UseMaterialSearchReturn {
  results: Material[];            // Kết quả tìm kiếm
  total: number;                  // Tổng số kết quả
  loading: boolean;               // Đang tải
  error: Error | null;            // Lỗi (nếu có)
  search: (query?: string) => void;   // Hàm tìm kiếm (debounced)
  filterByType: (type: MaterialType) => void; // Lọc theo loại
  clear: () => void;              // Xóa kết quả
  page: number;                   // Trang hiện tại
  limit: number;                  // Số items mỗi trang
  hasNextPage: boolean;           // Còn trang sau
  hasPreviousPage: boolean;       // Còn trang trước
  nextPage: () => void;           // Trang sau
  previousPage: () => void;       // Trang trước
}

/**
 * Hook tìm kiếm nguyên liệu với debounce
 * @param debounceMs - Thời gian debounce (ms), mặc định 500ms
 */
export const useMaterialSearch = (
  debounceMs: number = 500,
): UseMaterialSearchReturn => {
  const [results, setResults] = useState<Material[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<MaterialType | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (q: string, type: MaterialType | null, p: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        let response: PaginatedMaterialResponse;

        if (type && !q) {
          // Filter by type only
          response = await materialService.filterByType(type, p, limit);
        } else if (q && !type) {
          // Search by query
          response = await materialService.search(q, p, limit);
        } else if (q && type) {
          // Search with type filter (search takes precedence)
          response = await materialService.search(q, p, limit);
        } else {
          // No query and no type, clear results
          setResults([]);
          setTotal(0);
          setLoading(false);
          return;
        }

        setResults(response.data);
        setTotal(response.pagination.total);
        setPage(response.pagination.page);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Search failed");
        setError(error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  const search = useCallback(
    (q: string = "") => {
      const normalizedQuery = q.trim();
      setQuery(normalizedQuery);
      setPage(1);

      // Clear previous timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // If query is too short and no filter type, clear results immediately
      if (normalizedQuery.length < 2 && !filterType) {
        setResults([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      // Set new timer for debounced search
      debounceTimer.current = setTimeout(() => {
        performSearch(normalizedQuery, filterType, 1);
      }, debounceMs);
    },
    [filterType, debounceMs, performSearch],
  );

  const filterByType = useCallback(
    (type: MaterialType) => {
      setFilterType(type);
      setQuery("");
      setPage(1);
      performSearch("", type, 1);
    },
    [performSearch],
  );

  const clear = useCallback(() => {
    setQuery("");
    setFilterType(null);
    setResults([]);
    setTotal(0);
    setPage(1);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  const hasNextPage = page * limit < total;
  const hasPreviousPage = page > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      const newPage = page + 1;
      setPage(newPage);
      performSearch(query, filterType, newPage);
    }
  }, [hasNextPage, page, query, filterType, performSearch]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      const newPage = page - 1;
      setPage(newPage);
      performSearch(query, filterType, newPage);
    }
  }, [hasPreviousPage, page, query, filterType, performSearch]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    results,
    total,
    loading,
    error,
    search,
    filterByType,
    clear,
    page,
    limit,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
  };
};
