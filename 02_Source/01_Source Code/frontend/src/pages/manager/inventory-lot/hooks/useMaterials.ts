import { useEffect, useState } from "react";
import { apiClient } from "../../../../services/apiClient";

export interface Material {
  _id: string;
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions: string;
  specification_document: string;
  created_date: string;
  modified_date: string;
}

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoading(true);
        const { data, error: apiError } = await apiClient.get<any>("/materials");

        if (apiError) {
          throw new Error(apiError.message || "Failed to fetch materials");
        }

        // Handle both direct array response and wrapped response
        const materials = Array.isArray(data) ? data : data?.payload || data?.data || [];
        setMaterials(materials);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setMaterials([]);
        console.error("Error fetching materials:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  return { materials, loading, error };
}
