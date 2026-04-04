import { X } from "lucide-react";
import {
  INVENTORY_ADJUSTMENT_REASON_LABELS,
  type InventoryAdjustmentItem,
} from "../../../types/inventoryAdjustment";

interface InventoryAdjustmentDetailDrawerProps {
  open: boolean;
  loading?: boolean;
  errorMessage?: string | null;
  item: InventoryAdjustmentItem | null;
  onClose: () => void;
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function InventoryAdjustmentDetailDrawer({
  open,
  loading = false,
  errorMessage,
  item,
  onClose,
}: InventoryAdjustmentDetailDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Đóng"
        className="h-full flex-1 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">
              Chi tiết điều chỉnh tồn kho
            </p>
            <h3 className="mt-1 text-lg font-black text-gray-900">
              {item?.adjustment_id ?? "Đang tải..."}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-sm font-semibold text-gray-600">
            Đang tải chi tiết phiếu điều chỉnh...
          </div>
        ) : errorMessage ? (
          <div className="p-6">
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </p>
          </div>
        ) : !item ? (
          <div className="p-6 text-sm font-semibold text-gray-600">
            Không có dữ liệu chi tiết.
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Lot ID
                </p>
                <p className="font-semibold text-gray-900">{item.lot_id}</p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Material ID
                </p>
                <p className="font-semibold text-gray-900">
                  {item.material_id}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Reason
                </p>
                <p className="font-semibold text-gray-900">
                  {INVENTORY_ADJUSTMENT_REASON_LABELS[item.reason_code] ||
                    item.reason_code}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Số lượng điều chỉnh
                </p>
                <p className="font-semibold text-gray-900">
                  {item.adjustment_quantity}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Quantity trước
                </p>
                <p className="font-semibold text-gray-900">
                  {item.quantity_before}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Quantity sau
                </p>
                <p className="font-semibold text-gray-900">
                  {item.quantity_after}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Valuation trước
                </p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(item.valuation_before)}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Valuation sau
                </p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(item.valuation_after)}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Valuation delta
                </p>
                <p
                  className={`font-semibold ${
                    item.valuation_delta >= 0
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(item.valuation_delta)}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Người thực hiện
                </p>
                <p className="font-semibold text-gray-900">
                  {item.performed_by}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3 md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Mã giao dịch liên kết
                </p>
                <p className="font-semibold text-gray-900">
                  {item.linked_transaction_id}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3 md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Ghi chú
                </p>
                <p className="font-semibold text-gray-900 whitespace-pre-wrap">
                  {item.reason_note || "-"}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3 md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Ngày tạo
                </p>
                <p className="font-semibold text-gray-900">
                  {formatDate(item.created_date)}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
