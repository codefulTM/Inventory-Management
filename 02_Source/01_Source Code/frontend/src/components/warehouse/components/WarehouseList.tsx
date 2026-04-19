import React, { useMemo } from "react";
import { useWarehouseList } from "../../../hooks/useWarehouseList";
import type { Warehouse } from "../../../types/warehouse";

interface WarehouseListProps {
  onSelect?: (w: Warehouse) => void;
}

export const WarehouseList: React.FC<WarehouseListProps> = ({ onSelect }) => {
  const {
    warehouses,
    total,
    page,
    limit,
    loading,
    error,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    setLimit,
    refetch,
  } = useWarehouseList();

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  if (error) {
    return (
      <div className="p-5 bg-white rounded shadow">
        <div className="text-red-600">
          Failed to load warehouses: {error.message}
        </div>
        <button className="mt-3 btn" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden shadow-md">
      <div className="px-5 py-5 border-b flex justify-between items-center">
        <h2 className="text-lg">Warehouses</h2>
        <div className="text-sm text-gray-600">
          Total: <strong>{total}</strong>
        </div>
      </div>

      {loading && warehouses.length === 0 ? (
        <div className="p-10 text-center text-gray-400">
          Loading warehouses...
        </div>
      ) : warehouses.length === 0 ? (
        <div className="p-10 text-center text-gray-400">
          No warehouses found
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-4 py-3">Warehouse ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr key={w._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <code className="bg-gray-100 px-2 rounded text-xs">
                        {w.warehouse_id}
                      </code>
                    </td>
                    <td className="px-4 py-3">{w.warehouse_name}</td>
                    <td className="px-4 py-3">{w.is_active ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      {new Date(w.created_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {onSelect && (
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                          onClick={() => onSelect(w)}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-5 border-t flex justify-between items-center">
            <div>
              <label className="text-sm text-gray-600 mr-2">
                Items per page:
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-2 py-1 border rounded"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={previousPage}
                disabled={!hasPreviousPage || loading}
                className="px-3 py-2 border rounded"
              >
                ← Prev
              </button>
              <span>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <button
                onClick={nextPage}
                disabled={!hasNextPage || loading}
                className="px-3 py-2 border rounded"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WarehouseList;
