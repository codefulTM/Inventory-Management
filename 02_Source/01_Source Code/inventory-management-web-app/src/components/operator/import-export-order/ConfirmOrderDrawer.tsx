import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type {
  ConfirmImportExportOrderPayload,
  ImportExportOrder,
} from "../../../types/importExportOrder";
import OrderStatusBadge from "./OrderStatusBadge";
import VarianceBadge from "./VarianceBadge";

interface ConfirmOrderDrawerProps {
  open: boolean;
  order: ImportExportOrder | null;
  submitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: ConfirmImportExportOrderPayload) => Promise<void>;
}

type ActualItem = {
  actual_quantity: string;
};

function toInitialActualItems(order: ImportExportOrder | null): ActualItem[] {
  if (!order || !Array.isArray(order.items)) {
    return [];
  }

  return order.items.map(() => ({ actual_quantity: "" }));
}

export default function ConfirmOrderDrawer({
  open,
  order,
  submitting = false,
  errorMessage,
  onClose,
  onSubmit,
}: ConfirmOrderDrawerProps) {
  const [actualItems, setActualItems] = useState<ActualItem[]>(
    toInitialActualItems(order),
  );
  const [confirmNote, setConfirmNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const rowPreview = useMemo(() => {
    if (!order) {
      return [];
    }

    return order.items.map((item, index) => {
      const expected = item.quantity;
      const actualRaw = actualItems[index]?.actual_quantity ?? "";
      const actual = Number(actualRaw);
      const hasActual = actualRaw.trim().length > 0 && Number.isFinite(actual);
      const variance = hasActual ? actual - expected : 0;

      return {
        ...item,
        expected,
        actualRaw,
        variance,
      };
    });
  }, [actualItems, order]);

  if (!open) {
    return null;
  }

  const updateActualQuantity = (index: number, value: string) => {
    setActualItems((previous) => {
      const next = [...previous];
      next[index] = { actual_quantity: value };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!order) {
      return;
    }

    if (!Array.isArray(order.items) || order.items.length === 0) {
      setLocalError("Phiếu không có dòng vật tư để xác nhận.");
      return;
    }

    const confirmed_items: ConfirmImportExportOrderPayload["confirmed_items"] =
      [];

    for (let index = 0; index < order.items.length; index += 1) {
      const sourceItem = order.items[index];
      const actualRaw = actualItems[index]?.actual_quantity ?? "";
      const actual = Number(actualRaw);

      if (!actualRaw.trim()) {
        setLocalError(`Vui lòng nhập số lượng thực tế cho dòng #${index + 1}.`);
        return;
      }

      if (!Number.isFinite(actual) || actual <= 0) {
        setLocalError(`Số lượng thực tế dòng #${index + 1} phải lớn hơn 0.`);
        return;
      }

      confirmed_items.push({
        material_id: sourceItem.material_id,
        lot_id: sourceItem.lot_id,
        expected_quantity: sourceItem.quantity,
        actual_quantity: actual,
        unit_of_measure: sourceItem.unit_of_measure,
      });
    }

    setLocalError(null);

    await onSubmit({
      confirmed_items,
      confirm_note: confirmNote.trim() ? confirmNote.trim() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex">
      <button
        type="button"
        aria-label="Đóng"
        className="h-full flex-1 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="relative h-full w-full max-w-4xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
              Xác nhận thực tế
            </p>
            <h3 className="mt-1 text-lg font-black text-gray-900">
              {order?.order_id ?? "-"}
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

        {!order ? (
          <div className="p-6 text-sm font-semibold text-gray-600">
            Không có dữ liệu phiếu để xác nhận.
          </div>
        ) : (
          <div className="space-y-5 p-6">
            <section className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <p>
                  <span className="font-semibold text-gray-500">
                    Trạng thái:
                  </span>{" "}
                  <OrderStatusBadge status={order.status} />
                </p>
                <p>
                  <span className="font-semibold text-gray-500">
                    Loại phiếu:
                  </span>{" "}
                  <span className="font-bold text-gray-900">
                    {order.order_type === "Inbound" ? "Nhập kho" : "Xuất kho"}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-gray-500">
                    Warehouse:
                  </span>{" "}
                  <span className="font-bold text-gray-900">
                    {order.warehouse_id}
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-gray-500">
                    Người tạo:
                  </span>{" "}
                  <span className="font-bold text-gray-900">
                    {order.created_by}
                  </span>
                </p>
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
              <h4 className="text-sm font-black uppercase tracking-wide text-indigo-700">
                Blind Count
              </h4>

              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Material</th>
                      <th className="px-3 py-2">Lot</th>
                      <th className="px-3 py-2">Expected</th>
                      <th className="px-3 py-2">Actual</th>
                      <th className="px-3 py-2">Variance</th>
                      <th className="px-3 py-2">UOM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rowPreview.map((row, index) => (
                      <tr
                        key={`${row.material_id}-${row.lot_id ?? "no-lot"}-${index}`}
                      >
                        <td className="px-3 py-2 font-semibold text-gray-800">
                          {row.material_id}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.lot_id ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.expected}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0.0001}
                            step="any"
                            value={row.actualRaw}
                            onChange={(event) =>
                              updateActualQuantity(index, event.target.value)
                            }
                            className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none transition focus:border-indigo-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <VarianceBadge variance={row.variance} />
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {row.unit_of_measure}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wide text-gray-600">
                Ghi chú xác nhận
                <textarea
                  value={confirmNote}
                  onChange={(event) => setConfirmNote(event.target.value)}
                  rows={3}
                  maxLength={255}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Nhập ghi chú nếu cần"
                />
              </label>
            </section>

            {localError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {localError}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Đang xác nhận..." : "Xác nhận thực tế"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
