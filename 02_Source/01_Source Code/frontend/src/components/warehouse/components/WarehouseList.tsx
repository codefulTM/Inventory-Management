import React, { useMemo, useEffect, useState } from "react";
import type { Warehouse } from "../../../types/warehouse";
import Toast from "../../Toast";
import SelectMenu from "../../SelectMenu";

interface WarehouseListProps {
  onSelect?: (w: Warehouse) => void;
  warehouses?: Warehouse[];
  total?: number;
  page?: number;
  limit?: number;
  loading?: boolean;
  error?: Error | null;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  nextPage?: () => void;
  previousPage?: () => void;
  setLimit?: (n: number) => void;
  refetch?: () => void;
}

export const WarehouseList: React.FC<WarehouseListProps> = ({
  onSelect,
  warehouses: propWarehouses,
  total: propTotal,
  page: propPage,
  limit: propLimit,
  loading: propLoading,
  error: propError,
  hasNextPage: propHasNextPage,
  hasPreviousPage: propHasPreviousPage,
  nextPage: propNextPage,
  previousPage: propPreviousPage,
  setLimit: propSetLimit,
  refetch: propRefetch,
}) => {
  const warehouses = propWarehouses ?? [];
  const total = propTotal ?? 0;
  const page = propPage ?? 1;
  const limit = propLimit ?? 20;
  const loading = propLoading ?? false;
  const error = propError ?? null;
  const hasNextPage = propHasNextPage ?? false;
  const hasPreviousPage = propHasPreviousPage ?? false;
  const nextPage = propNextPage ?? (() => {});
  const previousPage = propPreviousPage ?? (() => {});
  const setLimit = propSetLimit ?? (() => {});
  const refetch = propRefetch ?? (() => {});

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (error) {
      const msg =
        error instanceof Error ? error.message : "Lỗi khi tải danh sách kho";
      setToast({ message: msg, type: "error" });
    }
  }, [error]);

  if (error) {
    return (
      <div className="p-5 bg-white rounded shadow">
        <div className="text-red-600">
          Tải danh sách kho thất bại: {error.message}
        </div>
        <button className="mt-3 btn" onClick={refetch}>
          Thử lại
        </button>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden shadow-md">
      <div className="px-5 py-5 border-b flex justify-between items-center">
        <h2 className="text-lg">Danh sách kho</h2>
        <div className="text-sm text-gray-600">
          Tổng: <strong>{total}</strong>
        </div>
      </div>

      {loading && warehouses.length === 0 ? (
        <div className="p-10 text-center text-gray-400">
          Đang tải danh sách kho...
        </div>
      ) : warehouses.length === 0 ? (
        <div className="p-10 text-center text-gray-400">
          Không tìm thấy kho nào
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
                    <td className="px-4 py-3">
                      {w.is_active ? "Có" : "Không"}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(w.created_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {onSelect && (
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                          onClick={() => onSelect(w)}
                        >
                          Xem
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
              <label className="text-sm text-gray-600 mr-2">Số mục trên trang:</label>
              <SelectMenu
                items={[
                  { id: 10, label: "10" },
                  { id: 20, label: "20" },
                  { id: 50, label: "50" },
                  { id: 100, label: "100" },
                ]}
                value={limit}
                onChange={(id) => setLimit(Number(id))}
                className="inline-block"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={previousPage}
                disabled={!hasPreviousPage || loading}
                className="px-3 py-2 border rounded"
              >
                ← Trước
              </button>
              <span>
                Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
              </span>
              <button
                onClick={nextPage}
                disabled={!hasNextPage || loading}
                className="px-3 py-2 border rounded"
              >
                Tiếp →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WarehouseList;
