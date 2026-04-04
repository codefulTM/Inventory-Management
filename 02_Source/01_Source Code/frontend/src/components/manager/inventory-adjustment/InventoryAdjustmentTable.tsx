import { Eye } from "lucide-react";
import {
  INVENTORY_ADJUSTMENT_REASON_CODES,
  INVENTORY_ADJUSTMENT_REASON_LABELS,
  type InventoryAdjustmentItem,
  type InventoryAdjustmentListQuery,
} from "../../../types/inventoryAdjustment";

interface InventoryAdjustmentTableProps {
  items: InventoryAdjustmentItem[];
  loading?: boolean;
  errorMessage?: string | null;
  draftFilters: InventoryAdjustmentListQuery;
  page: number;
  limit: number;
  total: number;
  onDraftFilterChange: (changes: Partial<InventoryAdjustmentListQuery>) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onPageChange: (nextPage: number) => void;
  onViewDetail: (adjustmentId: string) => void;
}

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("vi-VN");
}

function hasInvalidDateRange(
  from?: string | Date,
  to?: string | Date,
): boolean {
  if (!from || !to) {
    return false;
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return false;
  }

  return fromDate.getTime() > toDate.getTime();
}

export default function InventoryAdjustmentTable({
  items,
  loading = false,
  errorMessage,
  draftFilters,
  page,
  limit,
  total,
  onDraftFilterChange,
  onApplyFilters,
  onResetFilters,
  onPageChange,
  onViewDetail,
}: InventoryAdjustmentTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const invalidDateRange = hasInvalidDateRange(
    draftFilters.from,
    draftFilters.to,
  );

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-md">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-black text-gray-900">
          Lịch sử điều chỉnh tồn kho
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Lot ID
          <input
            type="text"
            value={(draftFilters.lot_id as string) || ""}
            onChange={(event) =>
              onDraftFilterChange({ lot_id: event.target.value, page: 1 })
            }
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            placeholder="LOT-..."
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Material ID
          <input
            type="text"
            value={(draftFilters.material_id as string) || ""}
            onChange={(event) =>
              onDraftFilterChange({ material_id: event.target.value, page: 1 })
            }
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            placeholder="MAT-..."
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Reason
          <select
            value={(draftFilters.reason_code as string) || ""}
            onChange={(event) =>
              onDraftFilterChange({
                reason_code: (event.target.value ||
                  undefined) as InventoryAdjustmentListQuery["reason_code"],
                page: 1,
              })
            }
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">Tất cả</option>
            {INVENTORY_ADJUSTMENT_REASON_CODES.map((code) => (
              <option key={code} value={code}>
                {INVENTORY_ADJUSTMENT_REASON_LABELS[code]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Từ ngày
          <input
            type="date"
            value={
              typeof draftFilters.from === "string" ? draftFilters.from : ""
            }
            onChange={(event) =>
              onDraftFilterChange({ from: event.target.value, page: 1 })
            }
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Đến ngày
          <input
            type="date"
            value={typeof draftFilters.to === "string" ? draftFilters.to : ""}
            onChange={(event) =>
              onDraftFilterChange({ to: event.target.value, page: 1 })
            }
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={onApplyFilters}
            disabled={loading || invalidDateRange}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Áp dụng
          </button>
          <button
            type="button"
            onClick={onResetFilters}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </div>

      {invalidDateRange ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Khoảng ngày không hợp lệ: Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-emerald-50 text-left text-xs font-bold uppercase tracking-wide text-emerald-700">
            <tr>
              <th className="px-4 py-3">Mã điều chỉnh</th>
              <th className="px-4 py-3">Lot ID</th>
              <th className="px-4 py-3">Material ID</th>
              <th className="px-4 py-3">Lý do</th>
              <th className="px-4 py-3">Số lượng</th>
              <th className="px-4 py-3">Valuation Δ</th>
              <th className="px-4 py-3">Người thực hiện</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`adj-skeleton-${index}`}>
                  {Array.from({ length: 9 }).map((__, colIndex) => (
                    <td
                      key={`adj-skeleton-col-${colIndex}`}
                      className="px-4 py-3"
                    >
                      <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  Chưa có dữ liệu điều chỉnh tồn kho.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.adjustment_id}
                  className="transition hover:bg-emerald-50/40"
                >
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {item.adjustment_id}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.lot_id}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {item.material_id}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {INVENTORY_ADJUSTMENT_REASON_LABELS[item.reason_code] ||
                      item.reason_code}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {item.adjustment_quantity}
                  </td>
                  <td
                    className={`px-4 py-3 font-bold ${
                      item.valuation_delta >= 0
                        ? "text-emerald-700"
                        : "text-red-600"
                    }`}
                  >
                    {item.valuation_delta}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {item.performed_by}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(item.created_date)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onViewDetail(item.adjustment_id)}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      <Eye size={14} />
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-1 pt-3 text-sm text-gray-600">
        <p>
          Trang {page}/{totalPages} - Tổng {total} phiếu điều chỉnh
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={loading || page <= 1}
            className="rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Trước
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={loading || page >= totalPages}
            className="rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  );
}
