/**
 * useMaterialList Hook - Quản lý danh sách vật tư với phân trang
 * 
 * Chức năng:
 * - Tự động fetch danh sách vật tư khi page hoặc limit thay đổi
 * - Quản lý state: materials (danh sách), total (tổng), page, limit
 * - Cung cấp các hàm: nextPage, previousPage, goToPage, setLimit, refetch
 * 
 * @param initialPage - Trang bắt đầu (mặc định: 1)
 * @param initialLimit - Số items mỗi trang (mặc định: 20)
 * @returns Object chứa materials, total, page, limit, loading, error,
 *          hasNextPage, hasPreviousPage, refetch, nextPage, previousPage, goToPage, setLimit
 * 
 * Cách dùng:
 * const { materials, loading, nextPage, hasNextPage } = useMaterialList(1, 20);
 */
import { useState, useEffect, useCallback } from "react";
import type { Material, PaginatedMaterialResponse } from "../types/material";
import { materialService } from "../services/material.service";

/**
 * Interface trả về từ useMaterialList hook
 */
interface UseMaterialListReturn {
  materials: Material[];          // Danh sách vật tư
  total: number;                  // Tổng số vật tư
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
 * Hook quản lý danh sách vật tư phân trang
 * @param initialPage - Trang ban đầu (mặc định: 1)
 * @param initialLimit - Số items mỗi trang ban đầu (mặc định: 20)
 */
export const useMaterialList = (
  initialPage: number = 1,
  initialLimit: number = 20,
): UseMaterialListReturn => {
  // State lưu trữ danh sách vật tư
  const [materials, setMaterials] = useState<Material[]>([]);
  // State lưu trữ tống số vật tư
  const [total, setTotal] = useState(0);
  // State trang hiện tại
  const [page, setPage] = useState(initialPage);
  // State số items mỗi trang
  const [limit, setLimitState] = useState(initialLimit);
  // State loading
  const [loading, setLoading] = useState(true);
  // State lỗi
  const [error, setError] = useState<Error | null>(null);

  // Hàm fetch danh sách vật tư từ API
  const fetchMaterials = useCallback(
    async (p: number = page, l: number = limit) => {
      try {
        setLoading(true);
        setError(null);
        // Gọi API lấy danh sách vật tư phân trang
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
        setMaterials([]); // Reset danh sách khi lỗi
      } finally {
        setLoading(false);
      }
    },
    [], // Không có dependencies -> chỉ tạo một lần
  );

  // Tự động fetch khi page hoặc limit thay đổi
  useEffect(() => {
    fetchMaterials(page, limit);
  }, [page, limit, fetchMaterials]);

  // Kiểm tra có trang tiếp theo không (page * limit < total)
  const hasNextPage = page * limit < total;
  // Kiểm tra có trang trước không (page > 1)
  const hasPreviousPage = page > 1;

  // Chuyển đến trang sau
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage((p) => p + 1);
    }
  }, [hasNextPage]);

  // Chuyển đến trang trước
  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage((p) => p - 1);
    }
  }, [hasPreviousPage]);

  // Nhảy đến trang cụ thể
  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1) {
      setPage(newPage);
    }
  }, []);

  // Đặt số items mỗi trang (tối đa 100)
  const setLimit = useCallback((newLimit: number) => {
    if (newLimit > 0 && newLimit <= 100) {
      setLimitState(newLimit);
      setPage(1); // Reset về trang đầu khi thay đổi limit
    }
  }, []);

  // Tải lại dữ liệu
  const refetch = useCallback(() => {
    fetchMaterials(page, limit);
  }, [fetchMaterials, page, limit]);

  return {
    materials,  // Trả về danh sách vật tư
    total,      // Trả về tống số
    page,       // Trả về trang hiện tại
    limit,      // Trả về số items/trang
    loading,    // Trả về trạng thái loading
    error,      // Trả về lỗi (nếu có)
    hasNextPage,      // Trả về có trang sau không
    hasPreviousPage,  // Trả về có trang trước không
    refetch,         // Trả về hàm tải lại
    nextPage,        // Trả về hàm trang sau
    previousPage,    // Trả về hàm trang trước
    goToPage,       // Trả về hàm nhảy trang
    setLimit,        // Trả về hàm đặt limit
  };
};
