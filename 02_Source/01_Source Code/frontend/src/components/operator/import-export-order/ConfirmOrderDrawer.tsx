import { useEffect, useState } from "react";
import { X } from "lucide-react";
import OrderStatusBadge from "./OrderStatusBadge";

interface ConfirmOrderDrawerProps {
  open: boolean;
  order?: any | null;
  submitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload?: any) => Promise<void>;
}

export default function ConfirmOrderDrawer({
  open,
  order = null,
  submitting = false,
  errorMessage,
  onClose,
  onSubmit,
}: ConfirmOrderDrawerProps) {
  const [confirmNote, setConfirmNote] = useState("");

  const isImportExport = Boolean(order && Array.isArray(order.items));
  const [confirmedItems, setConfirmedItems] = useState<Array<any>>([]);

  useEffect(() => {
    if (isImportExport && order) {
      const init = order.items.map((it: any) => ({
        material_id: it.material_id,
        lot_id: it.lot_id,
        expected_quantity: typeof it.quantity === "number" ? it.quantity : Number(it.quantity) || 0,
        actual_quantity: typeof it.quantity === "number" ? it.quantity : Number(it.quantity) || 0,
        unit_of_measure: it.unit_of_measure ?? "",
      }));
      setConfirmedItems(init);
    } else {
      setConfirmedItems([]);
    }
  }, [order]);

  if (!open) return null;

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
            <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Xác nhận phiếu</p>
            <h3 className="mt-1 text-lg font-black text-gray-900">{(order?.slip_number ?? order?.order_id) ?? "-"}</h3>
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
          <div className="p-6 text-sm font-semibold text-gray-600">Không có dữ liệu phiếu để xác nhận.</div>
        ) : (
          <div className="space-y-5 p-6">
            <section className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <p>
                  <span className="font-semibold text-gray-500">Trạng thái:</span>{" "}
                  <OrderStatusBadge status={(order?.status === "CONFIRMED" ? "Confirmed" : order?.status === "REJECTED" ? "Rejected" : "PendingConfirmation") as any} />
                </p>
                <p>
                  <span className="font-semibold text-gray-500">Loại phiếu:</span>{" "}
                  <span className="font-bold text-gray-900">{order?.type === "IN" || order?.order_type === "Inbound" ? "Nhập kho" : "Xuất kho"}</span>
                </p>
                <p>
                  <span className="font-semibold text-gray-500">Warehouse:</span>{" "}
                  <span className="font-bold text-gray-900">{order?.warehouse_id ?? order?.warehouse}</span>
                </p>
                <p>
                  <span className="font-semibold text-gray-500">Người tạo:</span>{" "}
                  <span className="font-bold text-gray-900">{order?.created_by ?? "-"}</span>
                </p>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="text-sm font-black uppercase tracking-wide text-gray-700">Dòng vật tư</h4>
              <div className="overflow-x-auto mt-3">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Material</th>
                      <th className="px-3 py-2">Lot</th>
                      <th className="px-3 py-2">Expected</th>
                      <th className="px-3 py-2">Actual</th>
                      <th className="px-3 py-2">UOM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isImportExport
                      ? confirmedItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-semibold text-gray-800">{item.material_id ?? "-"}</td>
                            <td className="px-3 py-2 text-gray-700">{item.lot_id ?? "-"}</td>
                            <td className="px-3 py-2 text-gray-700">{item.expected_quantity}</td>
                            <td className="px-3 py-2 text-gray-700">
                              <input
                                type="number"
                                value={item.actual_quantity}
                                min={0}
                                onChange={(e) => {
                                  const val = Number(e.target.value || 0);
                                  setConfirmedItems((prev) => {
                                    const copy = prev.slice();
                                    copy[idx] = { ...copy[idx], actual_quantity: val };
                                    return copy;
                                  });
                                }}
                                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-gray-700">{item.unit_of_measure ?? "-"}</td>
                          </tr>
                        ))
                      : (order?.lines || []).map((line: any) => (
                          <tr key={line.line_id}>
                            <td className="px-3 py-2 font-semibold text-gray-800">{line.material_id ?? line.sku ?? "-"}</td>
                            <td className="px-3 py-2 text-gray-700">{line.lot_id ?? "-"}</td>
                            <td className="px-3 py-2 text-gray-700">{line.quantity}</td>
                            <td className="px-3 py-2 text-gray-700">{line.quantity}</td>
                            <td className="px-3 py-2 text-gray-700">{line.unit ?? "-"}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </section>

            {errorMessage ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{errorMessage}</p>
            ) : null}

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
                  if (isImportExport) {
                    const payload = {
                      confirmed_items: confirmedItems.map((it) => ({
                        material_id: it.material_id,
                        lot_id: it.lot_id,
                        expected_quantity: it.expected_quantity,
                        actual_quantity: it.actual_quantity,
                        unit_of_measure: it.unit_of_measure,
                      })),
                      confirm_note: confirmNote ? confirmNote.trim() : undefined,
                    };
                    void onSubmit(payload);
                  } else {
                    void onSubmit(confirmNote ? { confirm_note: confirmNote.trim() } : undefined);
                  }
                }}
                disabled={submitting}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Đang xác nhận..." : "Xác nhận"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
