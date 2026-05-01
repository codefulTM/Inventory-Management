import {
  INVENTORY_AUDIT_REPORT_STATUS_LABELS,
  type InventoryAuditReportItem,
  type InventoryAuditReportStatus,
} from "../../../types/inventoryAuditReport";

interface InventoryAuditReportTableProps {
  items: InventoryAuditReportItem[];
  loading?: boolean;
  error?: string | null;
  total: number;
  page: number;
  limit: number;
  selectedReportId?: string;
  onSelect: (reportId: string) => void;
  onPageChange: (page: number) => void;
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

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("vi-VN");
}

export default function InventoryAuditReportTable({
  items,
  loading = false,
  error,
  total,
  page,
  limit,
  selectedReportId,
  onSelect,
  onPageChange,
}: InventoryAuditReportTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-black text-gray-900">
          Danh sách báo cáo kiểm kê
        </h3>
        <span className="text-xs font-semibold text-gray-500">
          Tổng: {total}
        </span>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          <div className="h-10 animate-pulse rounded bg-gray-100" />
          <div className="h-10 animate-pulse rounded bg-gray-100" />
          <div className="h-10 animate-pulse rounded bg-gray-100" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
          Chưa có báo cáo kiểm kê phù hợp bộ lọc.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Mã báo cáo</th>
                <th className="px-3 py-2">Kỳ báo cáo</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">SL dòng</th>
                <th className="px-3 py-2">Người yêu cầu</th>
                <th className="px-3 py-2">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isSelected = selectedReportId === item.report_id;

                return (
                  <tr
                    key={item.report_id}
                    className={`cursor-pointer border-b border-gray-100 transition hover:bg-blue-50 ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                    onClick={() => onSelect(item.report_id)}
                  >
                    <td className="px-3 py-2 font-semibold text-gray-800">
                      {item.report_id}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {item.period_from ? item.period_from.slice(0, 10) : "-"} -{" "}
                      {item.period_to ? item.period_to.slice(0, 10) : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${statusClassName(item.status)}`}
                      >
                        {INVENTORY_AUDIT_REPORT_STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {item.summary_total_items ?? 0}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {item.requested_by}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {formatDate(item.created_date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2 text-sm">
        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          Trước
        </button>
        <span className="text-gray-600">
          Trang {page}/{totalPages}
        </span>
        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Sau
        </button>
      </div>
    </section>
  );
}
