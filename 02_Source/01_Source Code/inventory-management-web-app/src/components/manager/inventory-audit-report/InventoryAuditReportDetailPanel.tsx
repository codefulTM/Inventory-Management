import {
  INVENTORY_AUDIT_REPORT_STATUS_LABELS,
  type InventoryAuditReportItem,
  type InventoryAuditReportStatus,
} from "../../../types/inventoryAuditReport";

interface InventoryAuditReportDetailPanelProps {
  report: InventoryAuditReportItem | null;
  loading?: boolean;
  error?: string | null;
  downloading?: boolean;
  onDownload: (reportId: string) => Promise<void>;
  onRefresh: (reportId: string) => Promise<void>;
}

function statusClassName(status: InventoryAuditReportStatus): string {
  if (status === "READY") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "FAILED") {
    return "bg-red-100 text-red-700";
  }

  if (status === "PROCESSING") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

function renderValue(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function renderDate(value?: string): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("vi-VN");
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-all text-sm text-gray-800">
        {renderValue(value)}
      </p>
    </div>
  );
}

export default function InventoryAuditReportDetailPanel({
  report,
  loading = false,
  error,
  downloading = false,
  onDownload,
  onRefresh,
}: InventoryAuditReportDetailPanelProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-black text-gray-900">Chi tiết báo cáo</h3>
        {report ? (
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
            onClick={() => {
              void onRefresh(report.report_id);
            }}
          >
            Làm mới chi tiết
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          <div className="h-8 animate-pulse rounded bg-gray-100" />
          <div className="h-8 animate-pulse rounded bg-gray-100" />
          <div className="h-8 animate-pulse rounded bg-gray-100" />
        </div>
      ) : !report ? (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
          Chọn một báo cáo từ danh sách để xem chi tiết.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Mã báo cáo
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {report.report_id}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${statusClassName(report.status)}`}
            >
              {INVENTORY_AUDIT_REPORT_STATUS_LABELS[report.status]}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Từ ngày" value={report.period_from?.slice(0, 10)} />
            <Field label="Đến ngày" value={report.period_to?.slice(0, 10)} />
            <Field label="Người yêu cầu" value={report.requested_by} />
            <Field label="Người phê duyệt" value={report.approved_by} />
            <Field label="Số dòng" value={report.summary_total_items} />
            <Field
              label="Tổng số lượng"
              value={report.summary_total_quantity}
            />
            <Field label="Tổng giá trị" value={report.summary_total_value} />
            <Field
              label="Nhà cung cấp chữ ký"
              value={report.signature_provider}
            />
            <Field label="Mã băm SHA-256" value={report.file_sha256} />
            <Field label="Ngày ký" value={renderDate(report.signed_at)} />
            <Field label="Ngày tạo" value={renderDate(report.created_date)} />
            <Field
              label="Ngày cập nhật"
              value={renderDate(report.modified_date)}
            />
          </div>

          {report.failure_reason ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Lý do thất bại: {report.failure_reason}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={report.status !== "READY" || downloading}
              onClick={() => {
                void onDownload(report.report_id);
              }}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? "Đang tải..." : "Tải PDF"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
