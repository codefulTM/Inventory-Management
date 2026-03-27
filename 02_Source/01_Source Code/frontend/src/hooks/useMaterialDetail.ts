/**
 * useMaterialDetail Hook
 * Fetches and manages single material detail
 */

import { useState, useEffect, useCallback } from "react";
import type { Material } from "../types/Material";
import { materialService } from "../services/material.service";

interface UseMaterialDetailReturn {
  material: Material | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useMaterialDetail = (
  materialId: string | undefined,
): UseMaterialDetailReturn => {
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMaterial = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await materialService.findById(id);
      setMaterial(data);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to fetch material detail");
      setError(error);
      setMaterial(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (materialId) {
      fetchMaterial(materialId);
    } else {
      setLoading(false);
      setMaterial(null);
    }
  }, [materialId, fetchMaterial]);

  const refetch = useCallback(() => {
    if (materialId) {
      fetchMaterial(materialId);
    }
  }, [materialId, fetchMaterial]);

  return {
    material,
    loading,
    error,
    refetch,
  };
};
