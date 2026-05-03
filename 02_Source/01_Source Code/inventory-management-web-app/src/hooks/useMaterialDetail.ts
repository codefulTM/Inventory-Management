/**
 * useMaterialDetail Hook - Quản lý chi tiết một vật tư
 * 
 * Chức năng:
 * - Tự động fetch chi tiết vật tư khi materialId thay đổi
 * - Quản lý state: material (dữ liệu), loading (đang tải), error (lỗi)
 * - Cung cấp hàm refetch để tải lại dữ liệu
 * 
 * @param materialId - ID vật tư cần lấy chi tiết (có thể undefined)
 * @returns Object chứa material, loading, error, refetch
 * 
 * Cách dùng:
 * const { material, loading, error, refetch } = useMaterialDetail(id);
 */
import { useState, useEffect, useCallback } from "react";
import type { Material } from "../types/material";
import { materialService } from "../services/material.service";

/** Interface trả về từ useMaterialDetail hook */
interface UseMaterialDetailReturn {
  material: Material | null;  // Chi tiết vật tư (null nếu chưa có)
  loading: boolean;               // Có đang tải dữ liệu không
  error: Error | null;           // Lỗi nếu có (null nếu không có lỗi)
  refetch: () => void;             // Hàm tải lại dữ liệu
}

export const useMaterialDetail = (
  materialId: string | undefined, // ID vật tư (undefined nếu chưa chọn)
): UseMaterialDetailReturn => {
  // State lưu trữ chi tiết vật tư
  const [material, setMaterial] = useState<Material | null>(null);
  // State loading
  const [loading, setLoading] = useState(true);
  // State lưu lỗi
  const [error, setError] = useState<Error | null>(null);

  // Hàm fetch chi tiết vật tư từ API
  const fetchMaterial = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await materialService.findById(id);
      setMaterial(data); // Lưu vào state
    } catch (err) {
      // Xử lý lỗi
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to fetch material detail");
      setError(error);
      setMaterial(null); // Reset material khi lỗi
    } finally {
      setLoading(false); // Kết thúc loading
    }
  }, []); // Không có dependencies -> chỉ tạo 1 lần

  // Tự động fetch khi materialId thay đổi
  useEffect(() => {
    if (materialId) {
      fetchMaterial(materialId); // Fetch nếu có ID
    } else {
      // Reset state nếu không có ID
      setLoading(false);
      setMaterial(null);
    }
  }, [materialId, fetchMaterial]);

  // Hàm tải lại dữ liệu (dùng cho nút Refresh)
  const refetch = useCallback(() => {
    if (materialId) {
      fetchMaterial(materialId);
    }
  }, [materialId, fetchMaterial]);

  return {
    material,  // Trả về dữ liệu vật tư
    loading,  // Trả về trạng thái loading
    error,    // Trả về lỗi (nếu có)
    refetch, // Trả về hàm tải lại
  };
};
