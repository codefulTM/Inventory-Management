/**
 * LabelList component
 * Displays paginated label template list with search, filter, and action buttons.
 */

import React, { useEffect, useState, useCallback } from "react";
import { Search, Eye, Edit2, Trash2, Tag, Filter } from "lucide-react";
import type { LabelTemplate, LabelType } from "../../types/label";
import { LABEL_TYPES } from "../../types/label";
import { labelService } from "../../services/label.service";

interface LabelListProps {
  onSelect: (template: LabelTemplate) => void;
  onEdit: (template: LabelTemplate) => void;
  onDelete: (template: LabelTemplate) => void;
  onPrint: (template: LabelTemplate) => void;
  refreshKey?: number;
}

const LABEL_TYPE_COLORS: Record<LabelType, string> = {
  "Raw Material": "bg-blue-100 text-blue-800",
  Sample: "bg-purple-100 text-purple-800",
  Intermediate: "bg-yellow-100 text-yellow-800",
  "Finished Product": "bg-green-100 text-green-800",
  API: "bg-red-100 text-red-800",
  Status: "bg-gray-100 text-gray-800",
};

export const LabelList: React.FC<LabelListProps> = ({
  onSelect,
  onEdit,
  onDelete,
  onPrint,
  refreshKey = 0,
}) => {
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState<LabelType | "">("");
  const limit = 10;

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      if (search) {
        result = await labelService.search(search, page, limit);
      } else if (typeFilter) {
        result = await labelService.filterByType(typeFilter, page, limit);
      } else {
        result = await labelService.findAll(page, limit);
      }
      setTemplates(result?.data || []);
      setTotal(result?.total || 0);
      setTotalPages(result?.totalPages || 1);
    } catch (err) {
      console.error("Failed to load label templates:", err);
      setError("Failed to load label templates. Please try again.");
      setTemplates([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, refreshKey]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setTypeFilter("");
    setPage(1);
  };

  const handleTypeFilter = (type: LabelType | "") => {
    setTypeFilter(type);
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSearchInput("");
    setTypeFilter("");
    setPage(1);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header toolbar */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 flex-1 max-w-md"
          >
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by ID or name…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Type filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-gray-400" />
            <button
              onClick={() => handleTypeFilter("")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                typeFilter === ""
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {LABEL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => handleTypeFilter(t)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  typeFilter === t
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter indicator */}
        {(search || typeFilter) && (
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span>
              {search
                ? `Search: "${search}"`
                : `Type: "${typeFilter}"`}
            </span>
            <button
              onClick={handleClearFilters}
              className="text-blue-600 hover:underline font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Tag size={40} className="mx-auto mb-2 opacity-30" />
            <p className="font-medium">No label templates found</p>
            <p className="text-xs mt-1">Create a new template to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left font-bold text-gray-600 px-5 py-3">
                  Template ID
                </th>
                <th className="text-left font-bold text-gray-600 px-5 py-3">
                  Name
                </th>
                <th className="text-left font-bold text-gray-600 px-5 py-3">
                  Type
                </th>
                <th className="text-left font-bold text-gray-600 px-5 py-3">
                  Size (W × H)
                </th>
                <th className="text-left font-bold text-gray-600 px-5 py-3">
                  Created
                </th>
                <th className="text-right font-bold text-gray-600 px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {templates.map((t) => (
                <tr
                  key={t._id}
                  className="hover:bg-blue-50/40 transition-colors"
                >
                  <td className="px-5 py-4 font-mono text-xs text-gray-600">
                    {t.template_id}
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-900">
                    {t.template_name}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        LABEL_TYPE_COLORS[t.label_type] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {t.label_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {t.width}" × {t.height}"
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {new Date(t.created_date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onSelect(t)}
                        title="View detail"
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => onPrint(t)}
                        title="Print label"
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Tag size={15} />
                      </button>
                      <button
                        onClick={() => onEdit(t)}
                        title="Edit"
                        className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(t)}
                        title="Delete"
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer / Pagination */}
      {!loading && !error && templates.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing {(page - 1) * limit + 1}–
            {Math.min(page * limit, total)} of {total} templates
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium"
            >
              ‹ Prev
            </button>
            <span className="px-3 py-1.5 font-semibold">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium"
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
