import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toast from "../../components/Toast";
import InventoryAuditReportCreateForm from "../../components/manager/inventory-audit-report/InventoryAuditReportCreateForm";
import InventoryAuditReportTable from "../../components/manager/inventory-audit-report/InventoryAuditReportTable";
import InventoryAuditReportDetailPanel from "../../components/manager/inventory-audit-report/InventoryAuditReportDetailPanel";
import {
  createInventoryAuditReport,
  downloadInventoryAuditReport,
  fetchInventoryAuditReportDetail,
  fetchInventoryAuditReports,
  InventoryAuditReportApiError,
} from "../../services/inventoryAuditReportService";
import {
  INVENTORY_AUDIT_REPORT_STATUSES,
  INVENTORY_AUDIT_REPORT_STATUS_LABELS,
  type CreateInventoryAuditReportRequest,
  type InventoryAuditReportItem,
  type InventoryAuditReportStatus,
} from "../../types/inventoryAuditReport";

type ToastState = {
  message: string;
  type: "success" | "error";
};

type FilterDraft = {
  status: "" | InventoryAuditReportStatus;
  requested_by: string;
  from: string;
  to: string;
};

const DEFAULT_FILTER_DRAFT: FilterDraft = {
  status: "",
  requested_by: "",
  from: "",
  to: "",
};

function toUserMessage(
  action: "create" | "list" | "detail" | "download",
  error: unknown,
): string {
  const statusCode =
    error instanceof InventoryAuditReportApiError
      ? error.statusCode
      : undefined;

  if (statusCode === 400) {
    if (action === "download") {
      return "Báo cáo chưa sẵn sàng tải hoặc tham số không hợp lệ.";
    }
    return "Dữ liệu yêu cầu báo cáo không hợp lệ. Vui lòng kiểm tra lại.";
  }

  if (statusCode === 403) {
    return "Bạn không có quyền thực hiện chức năng báo cáo kiểm kê.";
  }

  if (statusCode === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (statusCode === 404) {
    return "Không tìm thấy báo cáo kiểm kê.";
  }

  if (typeof statusCode === "number" && statusCode >= 500) {
    return "Hệ thống đang bận, vui lòng thử lại sau.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (action === "create") {
    return "Không thể tạo yêu cầu báo cáo kiểm kê.";
  }
  if (action === "list") {
    return "Không thể tải danh sách báo cáo kiểm kê.";
  }
  if (action === "detail") {
    return "Không thể tải chi tiết báo cáo kiểm kê.";
  }

  return "Không thể tải file báo cáo kiểm kê.";
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function ReportsManager() {
  const [items, setItems] = useState<InventoryAuditReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [filterDraft, setFilterDraft] =
    useState<FilterDraft>(DEFAULT_FILTER_DRAFT);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterDraft>(DEFAULT_FILTER_DRAFT);
  const [debouncedRequestedBy, setDebouncedRequestedBy] = useState("");

  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [selectedReport, setSelectedReport] =
    useState<InventoryAuditReportItem | null>(null);

  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const listRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  const buildListQuery = useCallback(
    (pageValue: number) => ({
      page: pageValue,
      limit,
      ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
      ...(debouncedRequestedBy.length > 0
        ? { requested_by: debouncedRequestedBy }
        : {}),
      ...(appliedFilters.from
        ? { from: `${appliedFilters.from}T00:00:00.000Z` }
        : {}),
      ...(appliedFilters.to
        ? { to: `${appliedFilters.to}T23:59:59.999Z` }
        : {}),
    }),
    [appliedFilters, debouncedRequestedBy, limit],
  );

  const loadReports = useCallback(
    async (pageOverride?: number) => {
      const targetPage = pageOverride ?? page;
      const requestId = ++listRequestIdRef.current;
      setListLoading(true);
      setListError(null);

      try {
        const response = await fetchInventoryAuditReports(
          buildListQuery(targetPage),
        );

        if (requestId !== listRequestIdRef.current) {
          return;
        }

        setItems(response.items);
        setTotal(response.total);
      } catch (error) {
        if (requestId !== listRequestIdRef.current) {
          return;
        }

        setListError(toUserMessage("list", error));
      } finally {
        if (requestId === listRequestIdRef.current) {
          setListLoading(false);
        }
      }
    },
    [buildListQuery, page],
  );

  const loadDetail = useCallback(async (reportId: string) => {
    if (!reportId) {
      setSelectedReport(null);
      setDetailError(null);
      return;
    }

    setDetailLoading(true);
    setDetailError(null);
    const requestId = ++detailRequestIdRef.current;

    try {
      const report = await fetchInventoryAuditReportDetail(reportId);

      if (requestId !== detailRequestIdRef.current) {
        return;
      }

      setSelectedReport(report);
    } catch (error) {
      if (requestId !== detailRequestIdRef.current) {
        return;
      }

      setDetailError(toUserMessage("detail", error));
      setSelectedReport(null);
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setDetailLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedRequestedBy(filterDraft.requested_by.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [filterDraft.requested_by]);

  useEffect(() => {
    setPage(1);
    setAppliedFilters((prev) => ({
      ...prev,
      requested_by: debouncedRequestedBy,
    }));
  }, [debouncedRequestedBy]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    void loadDetail(selectedReportId);
  }, [loadDetail, selectedReportId]);

  // Poll a newly created report until it reaches READY or FAILED
  const [pollingReportId, setPollingReportId] = useState<string>("");
  useEffect(() => {
    if (!pollingReportId) return;
    if (
      selectedReport?.report_id === pollingReportId &&
      (selectedReport.status === "READY" || selectedReport.status === "FAILED")
    ) {
      setPollingReportId("");
      void loadReports();
      return;
    }

    const timer = window.setInterval(async () => {
      const detail = await fetchInventoryAuditReportDetail(pollingReportId).catch(() => null);
      if (!detail) return;
      setSelectedReport(detail);
      if (detail.status === "READY" || detail.status === "FAILED") {
        setPollingReportId("");
        void loadReports();
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [pollingReportId, selectedReport, loadReports]);

  const handleCreateReport = async (
    payload: CreateInventoryAuditReportRequest,
  ) => {
    if (createSubmitting) {
      return;
    }

    setCreateSubmitting(true);

    try {
      const created = await createInventoryAuditReport(payload);
      setToast({
        type: "success",
        message: `Đã tạo yêu cầu báo cáo ${created.report_id}.`,
      });

      setPage(1);
      await loadReports(1);
      setSelectedReportId(created.report_id);
      await loadDetail(created.report_id);
      setPollingReportId(created.report_id);
    } catch (error) {
      setToast({
        type: "error",
        message: toUserMessage("create", error),
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    if (downloadLoading) {
      return;
    }

    setDownloadLoading(true);

    try {
      const file = await downloadInventoryAuditReport(reportId);
      triggerDownload(file.blob, file.fileName);
      setToast({
        type: "success",
        message: `Đã tải báo cáo ${file.fileName}.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message: toUserMessage("download", error),
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleApplyFilters = () => {
    if (
      filterDraft.from &&
      filterDraft.to &&
      new Date(`${filterDraft.from}T00:00:00`) >
        new Date(`${filterDraft.to}T00:00:00`)
    ) {
      setListError(
        "Khoảng thời gian không hợp lệ: Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.",
      );
      return;
    }

    setPage(1);
    setAppliedFilters({
      ...filterDraft,
      requested_by: debouncedRequestedBy,
    });
  };

  const handleResetFilters = () => {
    setFilterDraft(DEFAULT_FILTER_DRAFT);
    setAppliedFilters(DEFAULT_FILTER_DRAFT);
    setPage(1);
    setListError(null);
  };

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
        <h1 className="text-2xl font-black text-gray-900">
          Báo cáo kiểm kê tồn kho
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Tạo báo cáo tổng hợp trạng thái tồn kho theo kỳ, theo dõi tiến trình xử lý và tải file PDF.
          Báo cáo đang xử lý sẽ tự động cập nhật mỗi 3 giây.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <InventoryAuditReportCreateForm
            submitting={createSubmitting}
            onSubmit={handleCreateReport}
          />
        </div>

        <div className="xl:col-span-2 space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-md">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Trạng thái
                <select
                  value={filterDraft.status}
                  onChange={(event) => {
                    setFilterDraft((prev) => ({
                      ...prev,
                      status: event.target.value as FilterDraft["status"],
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Tất cả</option>
                  {INVENTORY_AUDIT_REPORT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {INVENTORY_AUDIT_REPORT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Người yêu cầu
                <input
                  type="text"
                  value={filterDraft.requested_by}
                  onChange={(event) => {
                    setFilterDraft((prev) => ({
                      ...prev,
                      requested_by: event.target.value,
                    }));
                  }}
                  placeholder="manager01"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <span className="mt-1 block text-[11px] text-gray-500">
                  Bộ lọc này tự áp dụng sau 350ms.
                </span>
              </label>

              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Từ ngày
                <input
                  type="date"
                  value={filterDraft.from}
                  onChange={(event) => {
                    setFilterDraft((prev) => ({
                      ...prev,
                      from: event.target.value,
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Đến ngày
                <input
                  type="date"
                  value={filterDraft.to}
                  onChange={(event) => {
                    setFilterDraft((prev) => ({
                      ...prev,
                      to: event.target.value,
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                onClick={handleResetFilters}
              >
                Đặt lại
              </button>
              <button
                type="button"
                className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                disabled={listLoading}
                onClick={() => {
                  void loadReports();
                }}
              >
                Làm mới danh sách
              </button>
              <button
                type="button"
                className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                disabled={listLoading}
                onClick={handleApplyFilters}
              >
                Áp dụng bộ lọc
              </button>
            </div>
          </section>

          <InventoryAuditReportTable
            items={items}
            loading={listLoading}
            error={listError}
            total={total}
            page={Math.min(page, totalPages)}
            limit={limit}
            selectedReportId={selectedReportId}
            onPageChange={(nextPage) => {
              setPage(nextPage);
            }}
            onSelect={(reportId) => {
              setSelectedReportId(reportId);
            }}
          />

          <InventoryAuditReportDetailPanel
            report={selectedReport}
            loading={detailLoading}
            error={detailError}
            downloading={downloadLoading}
            onRefresh={async (reportId) => {
              await loadDetail(reportId);
            }}
            onDownload={handleDownloadReport}
          />
        </div>
      </div>

      {toast ? (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
