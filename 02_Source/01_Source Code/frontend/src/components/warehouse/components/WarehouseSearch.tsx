import React, { useState } from "react";

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
      if (onResult) onResult(q);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQ("");
    if (onResult) onResult("");
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-5 py-5 border-b border-gray-200">
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Tìm kiếm kho... (tối thiểu 2 ký tự)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-600 focus:shadow-md focus:shadow-blue-100"
            autoComplete="off"
          />
          {q && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-lg text-gray-400 cursor-pointer px-2 py-1 transition-colors hover:text-gray-800"
              onClick={handleClear}
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium"
            onClick={(e) => handleSearch(e)}
            disabled={loading}
          >
            Tìm
          </button>
          <button
            className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded text-sm font-medium"
            onClick={handleClear}
            disabled={loading}
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarehouseSearch;
