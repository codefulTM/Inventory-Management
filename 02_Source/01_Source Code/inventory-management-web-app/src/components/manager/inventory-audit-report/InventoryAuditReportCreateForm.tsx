/**
 * Component InventoryAuditReportCreateForm
 * Form tạo báo cáo kiểm kê kho mới cho quản lý (Manager role)
 * Hỗ trợ chọn kỳ báo cáo nhanh (tháng này, tháng trước, 30 ngày, quý, năm)
 * Tích hợp react-hook-form để quản lý form và validate dữ liệu
 */
import { useForm } from "react-hook-form";
import type { CreateInventoryAuditReportRequest } from "../../../types/inventoryAuditReport";

/** Props cho component InventoryAuditReportCreateForm */
interface InventoryAuditReportCreateFormProps {
  /** Trạng thái đang gửi dữ liệu (disabled form khi đang submit) */
  submitting?: boolean;
  /** Hàm callback khi form hợp lệ và người dùng nhấn Tạo báo cáo */
  onSubmit: (payload: CreateInventoryAuditReportRequest) => Promise<void>;
}

/** Kiểu dữ liệu cho các trường trong form tạo báo cáo kiểm kê */
type InventoryAuditReportCreateFormValues = {
  /** Ngày bắt đầu kỳ báo cáo (định dạng YYYY-MM-DD) */
  period_from: string;
  /** Ngày kết thúc kỳ báo cáo (định dạng YYYY-MM-DD) */
  period_to: string;
  /** Tên người phê duyệt báo cáo (tùy chọn) */
  approved_by: string;
  /** Ghi chú thêm cho báo cáo (tùy chọn) */
  note: string;
};

/** Chuyển đổi chuỗi ngày (YYYY-MM-DD) sang định dạng ISO UTC bắt đầu ngày */
function toIsoDay(dayText: string): string {
  return new Date(`${dayText}T00:00:00.000Z`).toISOString();
}

/** Định dạng đối tượng Date sang chuỗi YYYY-MM-DD */
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Hàm lấy khoảng ngày nhanh theo preset (tháng này, tháng trước, 30 ngày, quý, năm) */
function getPreset(preset: string): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed (0 = tháng 1)

  // Preset: Tháng này (từ ngày 1 đến cuối tháng hiện tại)
  if (preset === "this_month") {
    return {
      from: fmt(new Date(y, m, 1)),
      to: fmt(new Date(y, m + 1, 0)),
    };
  }
  // Preset: Tháng trước
  if (preset === "last_month") {
    return {
      from: fmt(new Date(y, m - 1, 1)),
      to: fmt(new Date(y, m, 0)),
    };
  }
  // Preset: 30 ngày qua (tính cả ngày hôm nay)
  if (preset === "last_30") {
    const to = new Date(now);
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { from: fmt(from), to: fmt(to) };
  }
  // Preset: Quý trước
  if (preset === "last_quarter") {
    const qStart = Math.floor(m / 3) * 3 - 3;
    return {
      from: fmt(new Date(y, qStart, 1)),
      to: fmt(new Date(y, qStart + 3, 0)),
    };
  }
  // Preset: Năm nay
  if (preset === "this_year") {
    return {
      from: fmt(new Date(y, 0, 1)),
      to: fmt(new Date(y, 11, 31)),
    };
  }
  // Mặc định: Lấy ngày hôm nay
  return { from: fmt(now), to: fmt(now) };
}

/** Danh sách các preset chọn nhanh kỳ báo cáo cho Manager */
const PRESETS = [
  { value: "this_month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "last_30", label: "30 ngày qua" },
  { value: "last_quarter", label: "Quý trước" },
  { value: "this_year", label: "Năm nay" },
  { value: "custom", label: "Tùy chọn" },
];

/** Preset mặc định khi mở form là "Tháng này" */
const DEFAULT_PRESET = "this_month";
const defaultDates = getPreset(DEFAULT_PRESET);

/** Giá trị mặc định cho form tạo báo cáo kiểm kê */
const DEFAULT_VALUES: InventoryAuditReportCreateFormValues = {
  period_from: defaultDates.from,
  period_to: defaultDates.to,
  approved_by: "",
  note: "",
};

/** Component chính: Form tạo báo cáo kiểm kê kho cho Manager */
export default function InventoryAuditReportCreateForm({
  submitting = false,
  onSubmit,
}: InventoryAuditReportCreateFormProps) {
  // Khởi tạo react-hook-form với chế độ validate khi blur (onTouched)
  const {
    register,
    watch,
    reset,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InventoryAuditReportCreateFormValues>({
    mode: "onTouched",
    defaultValues: DEFAULT_VALUES,
  });

  // Theo dõi giá trị ngày bắt đầu và kết thúc để validate
  const periodFrom = watch("period_from");
  const periodTo = watch("period_to");
  // Trạng thái đang gửi (từ props hoặc từ react-hook-form)
  const effectiveSubmitting = submitting || isSubmitting;

  /** Hàm áp dụng preset chọn nhanh kỳ báo cáo */
  const applyPreset = (preset: string) => {
    // Nếu chọn tùy chọn thì không tự động set ngày
    if (preset === "custom") return;
    const { from, to } = getPreset(preset);
    // Cập nhật giá trị ngày và trigger validate
    setValue("period_from", from, { shouldValidate: true });
    setValue("period_to", to, { shouldValidate: true });
  };

  /** Hàm xử lý khi form hợp lệ và người dùng nhấn Tạo báo cáo */
  const onValidSubmit = async (
    values: InventoryAuditReportCreateFormValues,
  ) => {
    // Tạo payload gửi lên API (chuyển đổi định dạng ngày sang ISO)
    const payload: CreateInventoryAuditReportRequest = {
      period_from: toIsoDay(values.period_from),
      // Đặt thời gian kết thúc là 23:59:59.999 của ngày kết thúc
      period_to: new Date(`${values.period_to}T23:59:59.999Z`).toISOString(),
      include_zero_balance: false,
      report_template_code: "STATUTORY_V1",
      approved_by: values.approved_by.trim() || undefined,
      note: values.note.trim() || undefined,
    };

    // Gọi callback onSubmit từ parent component
    await onSubmit(payload);

    // Reset form về giá trị mặc định (tháng hiện tại)
    const dates = getPreset(DEFAULT_PRESET);
    reset({ ...DEFAULT_VALUES, period_from: dates.from, period_to: dates.to });
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
          Báo cáo kiểm kê tồn kho
        </p>
        <h2 className="mt-1 text-xl font-black text-gray-900">
          Tạo báo cáo mới
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Hệ thống sẽ tổng hợp trạng thái tồn kho theo kỳ và xuất file PDF.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          void handleSubmit(onValidSubmit)(event);
        }}
      >
        {/* Period presets */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Chọn nhanh kỳ báo cáo
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => applyPreset(p.value)}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Từ ngày *
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...register("period_from", {
                required: "Từ ngày là bắt buộc.",
              })}
            />
            {errors.period_from ? (
              <span className="mt-1 block text-xs text-red-600">
                {errors.period_from.message}
              </span>
            ) : null}
          </label>

          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Đến ngày *
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...register("period_to", {
                required: "Đến ngày là bắt buộc.",
                validate: (value) => {
                  if (!periodFrom || !value) return true;
                  if (
                    new Date(`${periodFrom}T00:00:00`) >
                    new Date(`${value}T00:00:00`)
                  ) {
                    return "Đến ngày phải lớn hơn hoặc bằng từ ngày.";
                  }
                  return true;
                },
              })}
            />
            {errors.period_to ? (
              <span className="mt-1 block text-xs text-red-600">
                {errors.period_to.message}
              </span>
            ) : null}
          </label>
        </div>

        {/* Period summary */}
        {periodFrom && periodTo ? (
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            📅 Kỳ báo cáo:{" "}
            <span className="font-bold">{periodFrom}</span> →{" "}
            <span className="font-bold">{periodTo}</span>
          </div>
        ) : null}

        {/* Approved by */}
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">
          Người phê duyệt (tùy chọn)
          <input
            type="text"
            placeholder="VD: Nguyễn Văn A"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            {...register("approved_by", {
              maxLength: {
                value: 50,
                message: "Không vượt quá 50 ký tự.",
              },
            })}
          />
          {errors.approved_by ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.approved_by.message}
            </span>
          ) : null}
        </label>

        {/* Note */}
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">
          Ghi chú (tùy chọn)
          <textarea
            rows={2}
            placeholder="VD: Kiểm kê định kỳ quý 2, phạm vi toàn kho"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            {...register("note", {
              maxLength: {
                value: 500,
                message: "Ghi chú không vượt quá 500 ký tự.",
              },
            })}
          />
          {errors.note ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.note.message}
            </span>
          ) : null}
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              const dates = getPreset(DEFAULT_PRESET);
              reset({ ...DEFAULT_VALUES, period_from: dates.from, period_to: dates.to });
            }}
            disabled={effectiveSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Đặt lại
          </button>
          <button
            type="submit"
            disabled={effectiveSubmitting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {effectiveSubmitting ? "Đang tạo..." : "Tạo báo cáo"}
          </button>
        </div>
      </form>
    </section>
  );
}
