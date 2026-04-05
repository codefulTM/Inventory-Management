import { useForm } from "react-hook-form";
import type { CreateInventoryAuditReportRequest } from "../../../types/inventoryAuditReport";

interface InventoryAuditReportCreateFormProps {
  submitting?: boolean;
  onSubmit: (payload: CreateInventoryAuditReportRequest) => Promise<void>;
}

type InventoryAuditReportCreateFormValues = {
  period_from: string;
  period_to: string;
  scope_warehouse_ids_text: string;
  include_zero_balance: boolean;
  report_template_code: string;
  signer_profile_id: string;
  approved_by: string;
  note: string;
};

function toIsoDay(dayText: string): string {
  return new Date(`${dayText}T00:00:00.000Z`).toISOString();
}

function toWarehouseIds(rawText: string): string[] | undefined {
  const values = rawText
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return values.length > 0 ? values : undefined;
}

const TODAY = new Date().toISOString().slice(0, 10);

const DEFAULT_VALUES: InventoryAuditReportCreateFormValues = {
  period_from: TODAY,
  period_to: TODAY,
  scope_warehouse_ids_text: "",
  include_zero_balance: false,
  report_template_code: "STATUTORY_V1",
  signer_profile_id: "",
  approved_by: "",
  note: "",
};

export default function InventoryAuditReportCreateForm({
  submitting = false,
  onSubmit,
}: InventoryAuditReportCreateFormProps) {
  const {
    register,
    watch,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InventoryAuditReportCreateFormValues>({
    mode: "onTouched",
    defaultValues: DEFAULT_VALUES,
  });

  const periodFrom = watch("period_from");
  const periodTo = watch("period_to");
  const effectiveSubmitting = submitting || isSubmitting;

  const onValidSubmit = async (
    values: InventoryAuditReportCreateFormValues,
  ) => {
    const payload: CreateInventoryAuditReportRequest = {
      period_from: toIsoDay(values.period_from),
      period_to: toIsoDay(values.period_to),
      scope_warehouse_ids: toWarehouseIds(values.scope_warehouse_ids_text),
      include_zero_balance: values.include_zero_balance,
      report_template_code:
        values.report_template_code.trim() || "STATUTORY_V1",
      signer_profile_id: values.signer_profile_id.trim() || undefined,
      approved_by: values.approved_by.trim() || undefined,
      note: values.note.trim() || undefined,
    };

    await onSubmit(payload);

    reset({
      ...DEFAULT_VALUES,
      period_from: values.period_from,
      period_to: values.period_to,
      report_template_code: values.report_template_code,
      scope_warehouse_ids_text: values.scope_warehouse_ids_text,
    });
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
          Manager / US16
        </p>
        <h2 className="mt-1 text-xl font-black text-gray-900">
          Tạo yêu cầu báo cáo kiểm kê
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Kỳ báo cáo: <span className="font-bold">{periodFrom}</span> đến{" "}
          <span className="font-bold">{periodTo}</span>
        </p>
      </div>

      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          void handleSubmit(onValidSubmit)(event);
        }}
      >
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
                if (!periodFrom || !value) {
                  return true;
                }

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

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500 md:col-span-2">
          Danh sách kho (tùy chọn)
          <input
            type="text"
            placeholder="VD: WH-HN-01, WH-HCM-01"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            {...register("scope_warehouse_ids_text")}
          />
          <span className="mt-1 block text-[11px] text-gray-500">
            Nhập nhiều mã kho, phân tách bằng dấu phẩy.
          </span>
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 md:col-span-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            {...register("include_zero_balance")}
          />
          Bao gồm các dòng tồn kho có số lượng bằng 0
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Mẫu báo cáo
          <input
            type="text"
            placeholder="STATUTORY_V1"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            {...register("report_template_code", {
              maxLength: {
                value: 50,
                message: "Mã mẫu báo cáo không vượt quá 50 ký tự.",
              },
            })}
          />
          {errors.report_template_code ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.report_template_code.message}
            </span>
          ) : null}
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Hồ sơ chữ ký
          <input
            type="text"
            placeholder="default"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            {...register("signer_profile_id", {
              maxLength: {
                value: 80,
                message: "Hồ sơ chữ ký không vượt quá 80 ký tự.",
              },
            })}
          />
          {errors.signer_profile_id ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.signer_profile_id.message}
            </span>
          ) : null}
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500 md:col-span-2">
          Người phê duyệt
          <input
            type="text"
            placeholder="manager-approver"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            {...register("approved_by", {
              maxLength: {
                value: 50,
                message: "Người phê duyệt không vượt quá 50 ký tự.",
              },
            })}
          />
          {errors.approved_by ? (
            <span className="mt-1 block text-xs text-red-600">
              {errors.approved_by.message}
            </span>
          ) : null}
        </label>

        <label className="text-xs font-bold uppercase tracking-wide text-gray-500 md:col-span-2">
          Ghi chú
          <textarea
            rows={3}
            placeholder="Ghi chú thêm về phạm vi hoặc mục đích xuất báo cáo"
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
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {effectiveSubmitting ? "Đang tạo..." : "Tạo yêu cầu báo cáo"}
          </button>
        </div>
      </form>
    </section>
  );
}
