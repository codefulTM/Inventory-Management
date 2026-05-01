import { useEffect, useState } from "react";
import { BinAPI, type BinWorklistItem } from "../../../../services/bin.service";

export function useBinWorklist(warehouseId?: string) {
  const [bins, setBins] = useState<BinWorklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBins = async (wId?: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!wId) {
        setBins([]);
        return;
      }
      const { items, error } = await BinAPI.getWorklist({
        warehouse_id: wId,
        page: 1,
        limit: 500,
      });
      if (error) {
        let msg: string;
        if (typeof error === "string") msg = error;
        else if (error instanceof Error) msg = error.message;
        else if (error && typeof error === "object" && "message" in (error as any)) {
          msg = (error as any).message;
        } else {
          try {
            msg = JSON.stringify(error);
          } catch {
            msg = String(error);
          }
        }
        setError(msg);
        setBins([]);
      } else {
        setBins(items || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBins(warehouseId);
  }, [warehouseId]);

  return { bins, loading, error, reload: () => void fetchBins(warehouseId) };
}
