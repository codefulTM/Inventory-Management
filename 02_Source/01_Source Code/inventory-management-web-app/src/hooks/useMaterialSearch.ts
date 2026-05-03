/**
 * useMaterialSearch Hook - Tìm kiếm vật tư với debounce
 * 
 * Chức năng:
 * - Tìm kiếm vật tư theo từ khóa (query)
 * - Lọc theo loại vật tư (material_type)
 * - Hỗ trợ phân trang kết quả tìm kiếm
 * - Debounce: Chờ 500ms (mặc định) sau khi ngừng gõ mới gọi API
 *   (tránh gọi API quá nhiều khi người dùng đang gõ)
 * 
 * @param debounceMs - Thời gian debounce (ms), mặc định 500ms
 * @returns Object chứa: results, total, loading, error, 
 *          search, filterByType, clear, page, limit, hasNextPage, hasPreviousPage, nextPage, previousPage
 * 
 * Cách dùng:
 * const { search, results, loading } = useMaterialSearch(500);
 * search("Vitamin"); // Tìm kiếm với debounce
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
 * Hook tìm kiếm vật tư với debounce
 * @param debounceMs - Thời gian debounce (ms), mặc định 500ms
 */
export const useMaterialSearch = (
  debounceMs: number = 500,
): UseMaterialSearchReturn => {
  // State lưu kết quả tìm kiếm
  const [results, setResults] = useState<Material[]>([]);
  // State tổng số kết quả
  const [total, setTotal] = useState(0);
  // State trang hiện tại
  const [page, setPage] = useState(1);
  // State số items mỗi trang
  const [limit] = useState(20);
  // State loading
  const [loading, setLoading] = useState(false);
  // State lỗi
  const [error, setError] = useState<Error | null>(null);
  // State từ khóa tìm kiếm
  const [query, setQuery] = useState("");
  // State lọc theo loại
  const [filterType, setFilterType] = useState<MaterialType | null>(null);
  // Ref lưu timer debounce
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hàm thực hiện tìm kiếm (không debounce)
  const performSearch = useCallback(
    async (q: string, type: MaterialType | null, p: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        let response: PaginatedMaterialResponse;

        if (type && !q) {
          // Chỉ lọc theo loại (không tìm kiếm)
          response = await materialService.filterByType(type, p, limit);
        } else if (q && !type) {
          // Chỉ tìm kiếm (không lọc loại)
          response = await materialService.search(q, p, limit);
        } else if (q && type) {
          // Tìm kiếm và lọc loại (search takes precedence)
          response = await materialService.search(q, p, limit);
        } else {
          // Không có query và không có type -> xóa kết quả
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
        setResults([]); // Xóa kết quả khi lỗi
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  // Hàm tìm kiếm với debounce (người dùng gọi hàm này)
  const search = useCallback(
    (q: string = "") => {
      const normalizedQuery = q.trim();
      setQuery(normalizedQuery);
      setPage(1); // Reset về trang 1 khi tìm kiếm mới

      // Xóa timer cũ (nếu có)
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Nếu query quá ngắn và không có filter type -> xóa kết quả ngay
      if (normalizedQuery.length < 2 && !filterType) {
        setResults([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      // Đặt timer mới cho debounce search
      debounceTimer.current = setTimeout(() => {
        performSearch(normalizedQuery, filterType, 1);
      }, debounceMs);
    },
    [filterType, debounceMs, performSearch],
  );

  // Hàm lọc theo loại vật tư
  const filterByType = useCallback(
    (type: MaterialType) => {
      setFilterType(type);
      setQuery(""); // Xóa query khi lọc loại
      setPage(1); // Reset trang
      performSearch("", type, 1); // Tìm kiếm ngay (không debounce)
    },
    [performSearch],
  );

  // Hàm xóa kết quả tìm kiếm
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

  // Kiểm tra có trang tiếp theo và trang trước đó không
  const hasNextPage = page * limit < total;
  const hasPreviousPage = page > 1;

  // Chuyển đến trang tiếp theo
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      const newPage = page + 1;
      setPage(newPage);
      performSearch(query, filterType, newPage);
    }
  }, [hasNextPage, page, query, filterType, performSearch]);

  // Chuyển đến trang trước đó
  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      const newPage = page - 1;
      setPage(newPage);
      performSearch(query, filterType, newPage);
    }
  }, [hasPreviousPage, page, query, filterType, performSearch]);

  // Cleanup timer khi unmount
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
