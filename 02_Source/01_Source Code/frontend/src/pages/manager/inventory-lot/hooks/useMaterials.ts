import { useEffect, useState } from "react";
import { fetchMaterials } from "../../../../services/materialService";
import type { Material } from "../../../../types/material";

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterialsList = async () => {
      try {
        setLoading(true);
        const result = await fetchMaterials();

        setMaterials(Array.isArray(result) ? result : []);
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

    fetchMaterialsList();
  }, []);

  return { materials, loading, error };
}
