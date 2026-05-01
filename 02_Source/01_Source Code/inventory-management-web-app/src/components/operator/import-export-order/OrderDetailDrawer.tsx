import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type {
  WarehouseSlip,
  WarehouseSlipLine,
} from "../../../types/warehouseSlip";
import OrderStatusBadge from "./OrderStatusBadge";

interface EditableItem {
  material_id: string;
  lot_id: string;
  quantity: number;
  unit_of_measure: string;
  expected_location: string;
}

interface OrderDetailDrawerProps {
  open: boolean;
  order: WarehouseSlip | null;
  loading?: boolean;
  submitting?: boolean;
  errorMessage?: string | null;
  isEditing: boolean;
  onToggleEdit: (next: boolean) => void;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}

function toEditableItems(items: WarehouseSlipLine[] = []): EditableItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [
      {
        material_id: "",
        lot_id: "",
        quantity: 1,
        unit_of_measure: "",
        expected_location: "",
      },
    ];
  }

  return items.map((item) => ({
    material_id: item.material_id ?? item.sku ?? "",
    lot_id: item.lot_id ?? "",
    quantity: typeof item.quantity === "number" && Number.isFinite(item.quantity) ? item.quantity : 1,
    unit_of_measure: item.unit ?? "",
    expected_location: item.notes ?? "",
  }));
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

function sanitizeOptionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function OrderDetailDrawer({
  open,
  order,
  loading = false,
  submitting = false,
  errorMessage,
  isEditing,
  onToggleEdit,
  onClose,
  onSave,
}: OrderDetailDrawerProps) {
  const [warehouseId, setWarehouseId] = useState(order?.warehouse_id ?? "");
  const [orderType, setOrderType] = useState<"Inbound" | "Outbound">(
    order?.type === "IN" ? "Inbound" : (order as any)?.order_type ?? "Inbound",
  );
  const [reason, setReason] = useState(order?.notes ?? "");
  const [referenceNumber, setReferenceNumber] = useState(
    order?.reference_number ?? "",
  );
  const [items, setItems] = useState<EditableItem[]>(toEditableItems(order?.lines ?? []));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;

    if (Array.isArray((order as any).lines)) {
      setItems(toEditableItems((order as any).lines));
    } else if (Array.isArray((order as any).items)) {
      setItems(
        (order as any).items.map((it: any) => ({
          material_id: it.material_id ?? "",
          lot_id: it.lot_id ?? "",
          quantity: typeof it.quantity === "number" ? it.quantity : Number(it.quantity) || 0,
          unit_of_measure: it.unit_of_measure ?? "",
          expected_location: it.expected_location ?? "",
        })),
      );
    } else {
      setItems(toEditableItems([]));
    }
  }, [order]);

  const canEdit = (order as any)?.status === "PENDING" || (order as any)?.status === "PendingConfirmation";

  useEffect(() => {
    if (!open) {
      onToggleEdit(false);
    }
  }, [open, onToggleEdit]);

  const attachmentCount = useMemo(() => order?.attachments.length ?? 0, [order]);

  if (!open) {
    return null;
  }

  const updateItemField = (
    index: number,
    field: keyof EditableItem,
    value: string | number,
  ) => {
    setItems((previous) => {
      const next = [...previous];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const addItem = () => {
    setItems((previous) => [
      ...previous,
      {
        material_id: "",
        lot_id: "",
        quantity: 1,
        unit_of_measure: "",
        expected_location: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((previous) => {
      if (previous.length <= 1) {
        return previous;
      }
      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const handleSave = async () => {
    if (!order) {
      return;
    }

    if (!canEdit) {
      setLocalError(
        "Phiếu không còn trạng thái PendingConfirmation nên không thể chỉnh sửa.",
      );
      return;
    }

    if (!warehouseId.trim()) {
      setLocalError("Warehouse ID là bắt buộc.");
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      setLocalError("Cần ít nhất một dòng vật tư.");
      return;
    }

    const normalizedItems: any[] = [];

    for (const item of items) {
      if (!item.material_id.trim()) {
        setLocalError("Material ID là bắt buộc cho mọi dòng vật tư.");
        return;
      }

      if (!item.unit_of_measure.trim()) {
        setLocalError("Unit of measure là bắt buộc cho mọi dòng vật tư.");
        return;
      }

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        setLocalError("Số lượng phải lớn hơn 0.");
        return;
      }

      normalizedItems.push({
        material_id: item.material_id.trim(),
        lot_id: sanitizeOptionalText(item.lot_id),
        quantity: Number(item.quantity),
        unit_of_measure: item.unit_of_measure.trim(),
        expected_location: sanitizeOptionalText(item.expected_location),
      });
    }

    setLocalError(null);

    await onSave({
      order_type: orderType,
      warehouse_id: warehouseId.trim(),
      reason: sanitizeOptionalText(reason),
      reference_number: sanitizeOptionalText(referenceNumber),
      items: normalizedItems,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Đóng"
        className="h-full flex-1 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="relative h-full w-full max-w-3xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
              Chi tiết phiếu
            </p>
            <h3 className="mt-1 text-lg font-black text-gray-900">
              {order?.slip_number ?? order?.slip_id ?? "Đang tải..."}
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
            Đang tải chi tiết phiếu...
          </div>
        ) : !order ? (
          <div className="p-6 text-sm font-semibold text-gray-600">
            Không có dữ liệu chi tiết.
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <section className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <p>
                    <span className="font-semibold text-gray-500">Trạng thái:</span>{" "}
                    <OrderStatusBadge status={
                      (order as any)?.status === "CONFIRMED" ? "Confirmed" : (order as any)?.status === "REJECTED" ? "Rejected" : "PendingConfirmation"
                    } />
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">Loại phiếu:</span>{" "}
                    <span className="font-bold text-gray-900">{order?.type === "IN" ? "Nhập kho" : "Xuất kho"}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">Người tạo:</span>{" "}
                    <span className="font-bold text-gray-900">{order?.created_by ?? "-"}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">Ngày tạo:</span>{" "}
                    <span className="font-bold text-gray-900">{formatDate(order?.created_date)}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">Cập nhật:</span>{" "}
                    <span className="font-bold text-gray-900">{formatDate(((order as any)?.modified_date) ?? order?.created_date)}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">Số chứng từ:</span>{" "}
                    <span className="font-bold text-gray-900">{attachmentCount}</span>
                  </p>
                </div>
            </section>

            {isEditing ? (
              <section className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                <h4 className="text-sm font-black uppercase tracking-wide text-blue-700">
                  Chỉnh sửa phiếu pending
                </h4>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-600">
                    Warehouse ID *
                    <input
                      value={warehouseId}
                      onChange={(event) => setWarehouseId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wide text-gray-600">
                    Loại phiếu *
                    <select
                      value={orderType}
                      onChange={(event) =>
                        setOrderType(
                          event.target.value as "Inbound" | "Outbound",
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="Inbound">Nhập kho</option>
                      <option value="Outbound">Xuất kho</option>
                    </select>
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wide text-gray-600 md:col-span-2">
                    Số tham chiếu
                    <input
                      value={referenceNumber}
                      onChange={(event) =>
                        setReferenceNumber(event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wide text-gray-600 md:col-span-2">
                    Lý do
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black uppercase tracking-wide text-gray-600">
                      Danh sách vật tư
                    </h5>
                    <button
                      type="button"
                      onClick={addItem}
                      className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-blue-700"
                    >
                      + Thêm dòng
                    </button>
                  </div>

                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div
                        key={`editable-item-${index}`}
                        className="rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-500">
                            Dòng #{index + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length <= 1}
                            className="text-xs font-bold text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:text-gray-400"
                          >
                            Xóa dòng
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <input
                            value={item.material_id}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "material_id",
                                event.target.value,
                              )
                            }
                            placeholder="Material ID"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                          />
                          <input
                            value={item.lot_id}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "lot_id",
                                event.target.value,
                              )
                            }
                            placeholder="Lot ID"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                          />
                          <input
                            type="number"
                            min={0.001}
                            step="any"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "quantity",
                                Number(event.target.value || 0),
                              )
                            }
                            placeholder="Quantity"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                          />
                          <input
                            value={item.unit_of_measure}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "unit_of_measure",
                                event.target.value,
                              )
                            }
                            placeholder="Unit of measure"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                          />
                          <input
                            value={item.expected_location}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "expected_location",
                                event.target.value,
                              )
                            }
                            placeholder="Expected location"
                            className="md:col-span-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : (
              <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="text-sm font-black uppercase tracking-wide text-gray-700">Thông tin phiếu</h4>

                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <p>
                    <span className="font-semibold text-gray-500">Warehouse:</span>{" "}
                    <span className="font-bold text-gray-900">{order?.warehouse_id ?? "-"}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">Số tham chiếu:</span>{" "}
                    <span className="font-bold text-gray-900">{order?.reference_number || "-"}</span>
                  </p>
                  <p className="md:col-span-2">
                    <span className="font-semibold text-gray-500">Ghi chú:</span>{" "}
                    <span className="font-bold text-gray-900">{order?.notes || "-"}</span>
                  </p>
                </div>

                <div>
                  <h5 className="mb-2 text-xs font-black uppercase tracking-wide text-gray-600">Danh sách vật tư</h5>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                        <tr>
                          <th className="px-3 py-2">Material</th>
                          <th className="px-3 py-2">Lot</th>
                          <th className="px-3 py-2">Số lượng</th>
                          <th className="px-3 py-2">Đơn vị</th>
                          <th className="px-3 py-2">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(order?.lines || []).map((item, index) => (
                          <tr key={`${item.line_id}-${index}`}>
                            <td className="px-3 py-2 text-gray-700">{item.material_id ?? item.sku ?? "-"}</td>
                            <td className="px-3 py-2 text-gray-700">{item.lot_id || "-"}</td>
                            <td className="px-3 py-2 text-gray-700">{item.quantity}</td>
                            <td className="px-3 py-2 text-gray-700">{item.unit || "-"}</td>
                            <td className="px-3 py-2 text-gray-700">{item.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="text-sm font-black uppercase tracking-wide text-gray-700">
                Chứng từ ({attachmentCount})
              </h4>

              {attachmentCount === 0 ? (
                <p className="text-sm text-gray-500">
                  Chưa có chứng từ đính kèm.
                </p>
              ) : (
                <div className="space-y-2">
                  {order.attachments.map((attachment) => (
                    <a
                      key={attachment.file_id}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {attachment.original_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {attachment.mime_type} -{" "}
                        {Math.round(attachment.size_bytes / 1024)} KB
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </section>

            {errorMessage ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {localError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {localError}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => onToggleEdit(!isEditing)}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isEditing ? "Hủy sửa" : "Chỉnh sửa"}
                </button>
              ) : null}

              {isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleSave();
                  }}
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
