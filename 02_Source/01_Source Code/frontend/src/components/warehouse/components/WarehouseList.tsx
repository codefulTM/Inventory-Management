import React, { useMemo, useEffect, useState } from "react";
import type { Warehouse } from "../../../types/warehouse";
import Toast from "../../Toast";
import SelectMenu from "../../SelectMenu";

interface WarehouseListProps {
  onSelect?: (w: Warehouse) => void;
  onView?: (w: Warehouse) => void;
  onEdit?: (w: Warehouse) => void;
  onDelete?: (w: Warehouse) => void;
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
  onView,
  onEdit,
  onDelete,
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

  const handleView = onView ?? onSelect;

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
      <div className="w-full bg-white rounded-lg overflow-hidden shadow-md p-5">
        <div className="p-5 bg-red-50 border border-red-200 rounded text-red-600">
          <h3 className="m-0 mb-2.5">Tải danh sách kho thất bại</h3>
          <p className="m-0 mb-4 text-sm">{error.message}</p>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded cursor-pointer font-medium hover:bg-red-700"
            onClick={refetch}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden shadow-md">
      <div className="px-5 py-5 border-b border-gray-200 flex justify-between items-center">
        <h2 className="m-0 text-2xl text-gray-800">Danh sách kho</h2>
        <div className="text-sm text-gray-600">
          Tổng: <strong>{total}</strong> | Hiển thị{" "}
          <strong>{Math.min(limit, warehouses.length)}</strong> của{" "}
          <strong>{total}</strong>
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
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 font-bold text-left text-gray-800">
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Mã kho
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Tên kho
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Ngày tạo
                  </th>
                  <th className="px-4 py-3 border-b-2 border-gray-300 text-sm uppercase tracking-wide">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr
                    key={w._id}
                    className={`transition-colors hover:bg-gray-50`}
                  >
                    <td className="px-4 py-3 border-b border-gray-200">
                      <code className="bg-gray-100 px-1.5 py-1 rounded text-xs font-mono text-red-600">
                        {w.warehouse_id}
                      </code>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      {w.warehouse_name}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      {w.is_active ? (
                        <span className="inline-block px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">
                          Có
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium">
                          Không
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      {new Date(w.created_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        {handleView && (
                          <button
                            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium cursor-pointer transition-colors hover:bg-blue-700"
                            onClick={() => handleView(w)}
                            title="Xem chi tiết"
                          >
                            Xem
                          </button>
                        )}

                        {onEdit && (
                          <button
                            className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded text-xs font-medium cursor-pointer transition-colors hover:bg-gray-200"
                            onClick={() => onEdit(w)}
                            title="Chỉnh sửa"
                          >
                            Sửa
                          </button>
                        )}

                        {onDelete && (
                          <button
                            className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-medium cursor-pointer transition-colors hover:bg-rose-700"
                            onClick={() => onDelete(w)}
                            title="Xóa"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
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
                Số mục trên trang:
              </label>
              <SelectMenu
                items={[
                  { id: 10, label: "10" },
                  { id: 20, label: "20" },
                  { id: 50, label: "50" },
                  { id: 100, label: "100" },
                ]}
                value={limit}
                onChange={(id) => setLimit(Number(id))}
                selectClassName="px-2.5 py-1.5 border border-gray-300 rounded text-sm cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={previousPage}
                disabled={!hasPreviousPage || loading}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer font-medium transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Trước
              </button>
              <span className="text-sm text-gray-600">
                Trang <strong>{page}</strong> của <strong>{totalPages}</strong>
              </span>
              <button
                onClick={nextPage}
                disabled={!hasNextPage || loading}
                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer font-medium transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
