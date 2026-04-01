/**
 * MaterialList Component
 * Displays paginated list of materials with pagination controls
 */

import React, { useMemo } from "react";
import type { Material, MaterialType } from "../../../types/Material";
import { useMaterialList } from "../../../hooks";

interface MaterialListProps {
  onSelectMaterial?: (material: Material) => void;
  highlightType?: MaterialType;
}

export const MaterialList: React.FC<MaterialListProps> = ({
  onSelectMaterial,
  highlightType,
}) => {
  const {
    materials,
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
  } = useMaterialList();

  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);

  if (error) {
    return (
      <div className="w-full bg-white rounded-lg overflow-hidden shadow-md p-5">
        <div className="p-5 bg-red-50 border border-red-200 rounded text-red-600">
          <h3 className="m-0 mb-2.5">Failed to load materials</h3>
          <p className="m-0 mb-4 text-sm">{error.message}</p>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded cursor-pointer font-medium hover:bg-red-700"
            onClick={refetch}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden shadow-md">
      <div className="px-5 py-5 border-b border-gray-200 flex justify-between items-center">
        <h2 className="m-0 text-2xl text-gray-800">Materials</h2>
        <div className="text-sm text-gray-600">
          Total: <strong>{total}</strong> | Showing{" "}
          {Math.min(limit, materials.length)} of {total}
        </div>
      </div>

      {loading && materials.length === 0 ? (
        <div className="p-10 text-center text-gray-400">
          <p>Loading materials...</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="p-10 text-center text-gray-400">
          <p>No materials found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 font-bold text-left text-gray-800">
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Material ID
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Material Name
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Part Number
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Created Date
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr
                    key={material._id}
                    className={`transition-colors hover:bg-gray-50 ${
                      highlightType && material.material_type === highlightType
                        ? "bg-yellow-100"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 border-b border-gray-200">
                      <code className="bg-gray-100 px-1.5 py-1 rounded text-xs font-mono text-red-600">
                        {material.material_id}
                      </code>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      {material.material_name}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      {material.part_number}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                        {material.material_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      {new Date(material.created_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      {onSelectMaterial && (
                        <button
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium cursor-pointer transition-colors hover:bg-blue-700"
                          onClick={() => onSelectMaterial(material)}
                          title="View details"
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

          <div className="px-5 py-5 border-t border-gray-200 flex justify-between items-center flex-wrap gap-5">
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="limit-select"
                className="text-sm text-gray-600 font-medium"
              >
                Items per page:
              </label>
              <select
                id="limit-select"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={loading}
                className="px-2.5 py-1.5 border border-gray-300 rounded text-sm cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={previousPage}
                disabled={!hasPreviousPage || loading}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer font-medium transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-600">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <button
                onClick={nextPage}
                disabled={!hasNextPage || loading}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer font-medium transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default MaterialList;
