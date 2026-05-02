/**
 * InventoryAdjustmentForm - Form tạo phiếu điều chỉnh tồn kho cho Manager
 * Chức năng: Cho phép Manager tạo phiếu điều chỉnh số lượng tồn kho
 * Chọn lô hàng, nhập số lượng điều chỉnh (dương hoặc âm)
 * Chọn mã lý do điều chỉnh và nhập ghi chú
 * Hệ thống sẽ kiểm tra và cập nhật số lượng tồn kho tương ứng
 */
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type {
  CreateInventoryAdjustmentRequest,
  InventoryAdjustmentReasonCode,
} from "../../../types/inventoryAdjustment";
import {
  InventoryLotAPI,
  type InventoryLotOptionItem,
} from "../../../services/inventory-lot.service";
import {
  INVENTORY_ADJUSTMENT_REASON_CODES,
  INVENTORY_ADJUSTMENT_REASON_LABELS,
} from "../../../types/inventoryAdjustment";

/** Props cho component InventoryAdjustmentForm */
interface InventoryAdjustmentFormProps {
  submitting?: boolean; // Trạng thái đang gửi dữ liệu
  onSubmit: (payload: CreateInventoryAdjustmentRequest) => Promise<void>; // Callback khi submit
}

/** Kiểu dữ liệu cho các trường trong form điều chỉnh */
type InventoryAdjustmentFormValues = {
  lot_id: string;                    // Mã lô hàng cần điều chỉnh
  adjustment_quantity: number;        // Số lượng điều chỉnh (dương: tăng, âm: giảm)
  reason_code: InventoryAdjustmentReasonCode; // Mã lý do điều chỉnh
  reason_note: string;                // Ghi chú lý do (bắt buộc nếu reason_code = OTHER)
  unit_cost_snapshot: number;         // Giá vốn tại thời điểm điều chỉnh
};

/** Giá trị mặc định cho form điều chỉnh */
const DEFAULT_VALUES: InventoryAdjustmentFormValues = {
  lot_id: "",
  adjustment_quantity: 0,
  reason_code: "DAMAGED",
  reason_note: "",
  unit_cost_snapshot: 0,
};

/** Component chính: Form tạo phiếu điều chỉnh tồn kho */
export default function InventoryAdjustmentForm({
  submitting = false,
  onSubmit,
}: InventoryAdjustmentFormProps) {
  // State danh sách lô hàng để chọn trong form
  const [lotOptions, setLotOptions] = useState<InventoryLotOptionItem[]>([]);
  const [isLoadingLots, setIsLoadingLots] = useState(false);
  const [lotOptionsError, setLotOptionsError] = useState<string | null>(null);

  // Khởi tạo react-hook-form với chế độ validate khi blur
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

  // Theo dõi các giá trị form để hiển thị thông tin động
  const reasonCode = watch("reason_code");
  const selectedLotId = watch("lot_id");
  const isOtherReason = reasonCode === "OTHER";
  const effectiveSubmitting = submitting || isSubmitting;

  // Label của lý do đang chọn (dùng để hiển thị)
  const reasonLabel = useMemo(
    () => INVENTORY_ADJUSTMENT_REASON_LABELS[reasonCode] ?? reasonCode,
    [reasonCode],
  );

  // Lô hàng đang được chọn từ danh sách
  const selectedLot = useMemo(
    () => lotOptions.find((lot) => lot.lot_id === selectedLotId),
    [lotOptions, selectedLotId],
  );

  /** Tải danh sách lô hàng từ API (loại trừ lô đã hết hàng) */
  const loadLotOptions = async () => {
    setIsLoadingLots(true);
    setLotOptionsError(null);

    const { items, error } = await InventoryLotAPI.getOptions({
      page: 1,
      limit: 200,
      exclude_status: "Depleted",
    });

    if (error) {
      setLotOptions([]);
      setLotOptionsError("Không thể tải danh sách lô hàng. Vui lòng thử lại.");
      setIsLoadingLots(false);
      return;
    }

    setLotOptions(items);
    setIsLoadingLots(false);
  };

  // Tải danh sách lô hàng khi component mount
  useEffect(() => {
    void loadLotOptions();
  }, []);

  /** Xử lý submit form - tạo payload và gọi API */
  const onValidSubmit = async (values: InventoryAdjustmentFormValues) => {
    const payload: CreateInventoryAdjustmentRequest = {
      lot_id: values.lot_id.trim(),
      adjustment_quantity: Number(values.adjustment_quantity),
      reason_code: values.reason_code,
      reason_note: values.reason_note.trim() || undefined,
      unit_cost_snapshot: Number(values.unit_cost_snapshot),
    };

    try {
      // Gọi callback onSubmit từ parent component
      await onSubmit(payload);
      // Reset form về giá trị mặc định (giữ lại reason_code và unit_cost_snapshot)
      reset({
        ...DEFAULT_VALUES,
        reason_code: values.reason_code,
        unit_cost_snapshot: values.unit_cost_snapshot,
      });
    } catch {
      // Parent page already maps and displays API errors.
    }
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

      {/* Form tạo phiếu điều chỉnh - 2 cột trên desktop */}
      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          void handleSubmit(onValidSubmit)(event);
        }}
      >
        <label className="text-xs font-bold uppercase tracking-wide text-gray-500 md:col-span-2">
          Mã lô *
          <select
            disabled={effectiveSubmitting || isLoadingLots}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
            {...register("lot_id", {
              required: "Mã lô là bắt buộc.",
            })}
          >
            <option value="">
              {isLoadingLots ? "Đang tải..." : "-- Chọn mã lô --"}
            </option>
            {lotOptions.map((lot) => (
              <option key={lot.lot_id} value={lot.lot_id}>
                {lot.lot_id} | {lot.material_id} | {lot.quantity}{" "}
                {lot.unit_of_measure}
              </option>
            ))}
          </select>
          {errors.lot_id ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.lot_id.message}
            </span>
          ) : null}
          {lotOptionsError ? (
            <span className="mt-1 block text-xs text-amber-700">
              {lotOptionsError}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void loadLotOptions();
            }}
            disabled={effectiveSubmitting || isLoadingLots}
            className="mt-2 inline-flex rounded-md border border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingLots ? "Đang tải..." : "Làm mới danh sách lô"}
          </button>
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500 md:col-span-2">
          Mã vật tư (đối soát)
          <input
            type="text"
            readOnly
            value={selectedLot?.material_id ?? ""}
            placeholder="Tự điền theo lot"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none"
          />
          {selectedLot ? (
            <span className="mt-1 block text-[11px] text-gray-500">
              Tồn hiện tại: {selectedLot.quantity} {selectedLot.unit_of_measure}{" "}
              | Trạng thái: {selectedLot.status}
            </span>
          ) : null}
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Số lượng điều chỉnh *
          <input
            type="number"
            step="0.01"
            placeholder="VD: 100 (tăng) hoặc -50 (giảm)"
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
          Giá vốn tức thời (đ/unit) *
          <input
            type="number"
            step="0.01"
            min="0"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            {...register("unit_cost_snapshot", {
              required: "Giá vốn tức thời là bắt buộc.",
              valueAsNumber: true,
              min: {
                value: 0,
                message: "Giá vốn tức thời không được nhỏ hơn 0.",
              },
            })}
            placeholder="Nhập giá cost/unit tại thời điểm điều chỉnh"
          />
          <span className="mt-1 block text-[11px] text-gray-600">
            Dùng để tính giá trị tồn kho: số lượng × giá vốn tức thời
          </span>
          {errors.unit_cost_snapshot ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.unit_cost_snapshot.message}
            </span>
          ) : null}
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500 md:col-span-2">
          Mã lý do *
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            {...register("reason_code", {
              required: "Mã lý do là bắt buộc.",
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
          Ghi chú lý do {isOtherReason ? "*" : "(tùy chọn)"}
          <textarea
            rows={3}
            placeholder={
              isOtherReason
                ? "VD: Phát hiện lỗi khi kiểm kê trong buổi thanh khoán tối ngày 15/3/2026"
                : "VD: Điều chỉnh do chênh lệch kiểm kê"
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
