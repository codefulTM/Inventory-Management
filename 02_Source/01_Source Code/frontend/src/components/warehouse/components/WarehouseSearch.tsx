import React, { useState } from "react";
import warehouseService from "../../../services/warehouseService";

interface Props {
  onResult?: (q: string) => void;
}

export const WarehouseSearch: React.FC<Props> = ({ onResult }) => {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      // Basic search: call service with query param if implemented on backend
      if (onResult) onResult(q);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2 items-center">
      <input
        placeholder="Tìm kiếm kho..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="px-3 py-2 border rounded w-full"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-3 py-2 bg-blue-600 text-white rounded"
      >
        Tìm
      </button>
    </form>
  );
};

export default WarehouseSearch;
