/**
 * useMaterialList Hook
 * Manages paginated material list fetching and state
 */

import { useState, useEffect, useCallback } from "react";
import type { Material, PaginatedMaterialResponse } from "../types/Material";
import { materialService } from "../services/material.service";

interface UseMaterialListReturn {
  materials: Material[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  refetch: () => void;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  setLimit: (limit: number) => void;
}

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
