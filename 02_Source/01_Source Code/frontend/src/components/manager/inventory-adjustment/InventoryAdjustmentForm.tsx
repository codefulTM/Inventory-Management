import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type {
  CreateInventoryAdjustmentRequest,
  InventoryAdjustmentReasonCode,
} from "../../../types/inventoryAdjustment";
import {
  INVENTORY_ADJUSTMENT_REASON_CODES,
  INVENTORY_ADJUSTMENT_REASON_LABELS,
} from "../../../types/inventoryAdjustment";

interface InventoryAdjustmentFormProps {
  submitting?: boolean;
  onSubmit: (payload: CreateInventoryAdjustmentRequest) => Promise<void>;
}

type InventoryAdjustmentFormValues = {
  lot_id: string;
  adjustment_quantity: number;
  reason_code: InventoryAdjustmentReasonCode;
  reason_note: string;
  unit_cost_snapshot: number;
};

const DEFAULT_VALUES: InventoryAdjustmentFormValues = {
  lot_id: "",
  adjustment_quantity: 0,
  reason_code: "DAMAGED",
  reason_note: "",
  unit_cost_snapshot: 0,
};

export default function InventoryAdjustmentForm({
  submitting = false,
  onSubmit,
}: InventoryAdjustmentFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InventoryAdjustmentFormValues>({
    mode: "onTouched",
    defaultValues: DEFAULT_VALUES,
  });

  const reasonCode = watch("reason_code");
  const isOtherReason = reasonCode === "OTHER";
  const effectiveSubmitting = submitting || isSubmitting;

  const reasonLabel = useMemo(
    () => INVENTORY_ADJUSTMENT_REASON_LABELS[reasonCode] ?? reasonCode,
    [reasonCode],
  );

  const onValidSubmit = async (values: InventoryAdjustmentFormValues) => {
    const payload: CreateInventoryAdjustmentRequest = {
      lot_id: values.lot_id.trim(),
      adjustment_quantity: Number(values.adjustment_quantity),
      reason_code: values.reason_code,
      reason_note: values.reason_note.trim() || undefined,
      unit_cost_snapshot: Number(values.unit_cost_snapshot),
    };

    await onSubmit(payload);

    reset({
      ...DEFAULT_VALUES,
      reason_code: values.reason_code,
      unit_cost_snapshot: values.unit_cost_snapshot,
    });
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">
          Manager / US10
        </p>
        <h2 className="mt-1 text-xl font-black text-gray-900">
          Tạo phiếu điều chỉnh tồn kho
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Lý do hiện tại: <span className="font-bold">{reasonLabel}</span>
        </p>
      </div>

      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          void handleSubmit(onValidSubmit)(event);
        }}
      >
        <label className="text-xs font-bold uppercase tracking-wide text-gray-500 md:col-span-2">
          Lot ID *
          <input
            type="text"
            placeholder="Ví dụ: d9e2d622-06d0-4c77-a79d-509dbfa2b8a1"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            {...register("lot_id", {
              required: "Lot ID là bắt buộc.",
              maxLength: {
                value: 36,
                message: "Lot ID không được vượt quá 36 ký tự.",
              },
            })}
          />
          {errors.lot_id ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.lot_id.message}
            </span>
          ) : null}
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Số lượng điều chỉnh *
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            {...register("adjustment_quantity", {
              required: "Số lượng điều chỉnh là bắt buộc.",
              valueAsNumber: true,
              validate: {
                nonZero: (value) =>
                  value !== 0 || "Số lượng điều chỉnh phải khác 0.",
              },
            })}
          />
          {errors.adjustment_quantity ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.adjustment_quantity.message}
            </span>
          ) : null}
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Unit Cost Snapshot *
          <input
            type="number"
            step="0.01"
            min="0"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            {...register("unit_cost_snapshot", {
              required: "Unit cost snapshot là bắt buộc.",
              valueAsNumber: true,
              min: {
                value: 0,
                message: "Unit cost snapshot không được nhỏ hơn 0.",
              },
            })}
          />
          {errors.unit_cost_snapshot ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.unit_cost_snapshot.message}
            </span>
          ) : null}
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500 md:col-span-2">
          Reason Code *
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            {...register("reason_code", {
              required: "Reason code là bắt buộc.",
            })}
          >
            {INVENTORY_ADJUSTMENT_REASON_CODES.map((code) => (
              <option key={code} value={code}>
                {INVENTORY_ADJUSTMENT_REASON_LABELS[code]} ({code})
              </option>
            ))}
          </select>
          {errors.reason_code ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.reason_code.message}
            </span>
          ) : null}
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500 md:col-span-2">
          Ghi chú lý do {isOtherReason ? "*" : "(khuyến nghị)"}
          <textarea
            rows={3}
            placeholder={
              isOtherReason
                ? "Bắt buộc tối thiểu 10 ký tự khi chọn OTHER"
                : "Mô tả bối cảnh điều chỉnh"
            }
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            {...register("reason_note", {
              validate: (value) => {
                if (!isOtherReason) {
                  return true;
                }

                if (!value || value.trim().length < 10) {
                  return "Reason note phải có ít nhất 10 ký tự khi reason code là OTHER.";
                }

                return true;
              },
            })}
          />
          {errors.reason_note ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.reason_note.message}
            </span>
          ) : null}
        </label>

        <div className="md:col-span-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => reset(DEFAULT_VALUES)}
            disabled={effectiveSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Làm mới
          </button>
          <button
            type="submit"
            disabled={effectiveSubmitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {effectiveSubmitting ? "Đang lưu..." : "Tạo phiếu điều chỉnh"}
          </button>
        </div>
      </form>
    </section>
  );
}
