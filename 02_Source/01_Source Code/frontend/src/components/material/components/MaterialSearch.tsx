/**
 * MaterialSearch Component
 * Search materials with debounce + filter by type
 */

import React, { useState } from "react";
import type { MaterialType } from "../../../types/Material";
import { useMaterialSearch } from "../../../hooks";

interface MaterialSearchProps {
  onResultSelect?: (resultId: string) => void;
}

const MATERIAL_TYPES: MaterialType[] = [
  "API",
  "Excipient",
  "Dietary Supplement",
  "Container",
  "Closure",
  "Process Chemical",
  "Testing Material",
];

export const MaterialSearch: React.FC<MaterialSearchProps> = ({
  onResultSelect,
}) => {
  const [inputValue, setInputValue] = useState("");
  const {
    results,
    total,
    loading,
    error,
    search,
    filterByType,
    clear,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    page,
    limit,
  } = useMaterialSearch(500);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim().length >= 2) {
      search(value);
    } else if (value.trim().length === 0) {
      clear();
    }
  };

  const handleTypeFilter = (type: MaterialType) => {
    setInputValue("");
    filterByType(type);
  };

  const handleClear = () => {
    setInputValue("");
    clear();
  };

  const handleResultClick = (resultId: string) => {
    if (onResultSelect) {
      onResultSelect(resultId);
    }
  };

  const hasResults = results.length > 0;
  const isSearching =
    inputValue.trim().length >= 2 ||
    (total > 0 && results.length === 0 && loading);

  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-5 py-5 border-b border-gray-200">
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search by name, ID, or part number... (min 2 chars)"
            value={inputValue}
            onChange={handleSearchChange}
            className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-blue-600 focus:shadow-md focus:shadow-blue-100"
            autoComplete="off"
          />
          {inputValue && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-lg text-gray-400 cursor-pointer px-2 py-1 transition-colors hover:text-gray-800"
              onClick={handleClear}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border ${inputValue === "" && total === 0 ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200 hover:border-gray-600"}`}
            onClick={handleClear}
            title="Show all types"
          >
            All Types
          </button>
          {MATERIAL_TYPES.map((type) => (
            <button
              key={type}
              className="px-3 py-1.5 white-space-nowrap bg-gray-100 text-gray-600 border border-gray-300 rounded-full text-xs font-medium cursor-pointer transition-all hover:bg-gray-200 hover:border-gray-600"
              onClick={() => handleTypeFilter(type)}
              title={`Filter by ${type}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-5 py-4 border-t border-gray-200 bg-red-50 text-red-600 text-sm">
          <p>Search failed: {error.message}</p>
        </div>
      )}

      {isSearching && loading && !hasResults && (
        <div className="px-5 py-8 text-center text-gray-400">
          <p>Searching...</p>
        </div>
      )}

      {hasResults && (
        <div className="px-0 py-5 pb-5">
          <div className="flex justify-between items-center mb-4 px-5 py-4 border-t border-gray-200">
            <h3 className="m-0 text-lg text-gray-800">Search Results</h3>
            <span className="text-sm text-gray-400">
              {total} result{total !== 1 ? "s" : ""} found
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto px-5">
            {results.map((material) => (
              <div
                key={material._id}
                className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer transition-all hover:bg-blue-50 hover:border-blue-600 hover:shadow-md hover:shadow-blue-100"
                onClick={() => handleResultClick(material._id)}
              >
                <div className="flex gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    <code className="block bg-blue-100 px-2 py-1 rounded text-xs font-mono text-red-600 whitespace-nowrap">
                      {material.material_id}
                    </code>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 font-bold text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap">
                      {material.material_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Part: <strong>{material.part_number}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                    {material.material_type}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {(hasNextPage || hasPreviousPage) && (
            <div className="flex items-center gap-4 justify-center mt-4 px-5">
              <button
                onClick={previousPage}
                disabled={!hasPreviousPage || loading}
                className="px-3 py-1.5 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} ({Math.min(limit, results.length)} of {total})
              </span>
              <button
                onClick={nextPage}
                disabled={!hasNextPage || loading}
                className="px-3 py-1.5 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {inputValue === "" && total === 0 && !loading && !error && (
        <div className="px-5 py-8 text-center text-gray-400">
          <p>Enter a search query or select a type to begin</p>
        </div>
      )}
    </div>
  );
};

export default MaterialSearch;
