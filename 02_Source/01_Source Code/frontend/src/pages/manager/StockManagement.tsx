import { useCallback, useEffect, useState } from "react";
import Toast from "../../components/Toast";
import ConfirmOrderDrawer from "../../components/operator/import-export-order/ConfirmOrderDrawer";
import OrderDetailDrawer from "../../components/operator/import-export-order/OrderDetailDrawer";
import OrderWorklistTable from "../../components/operator/import-export-order/OrderWorklistTable";
import RejectOrderModal from "../../components/operator/import-export-order/RejectOrderModal";
import {
  confirmImportExportOrder,
  fetchImportExportOrderDetail,
  fetchImportExportOrderWorklist,
  ImportExportOrderApiError,
  rejectImportExportOrder,
} from "../../services/importExportOrderService";
import type {
  ConfirmImportExportOrderPayload,
  ImportExportOrder,
  ImportExportOrderQueryParams,
  ImportExportOrderType,
} from "../../types/importExportOrder";

interface WorklistFilters {
  order_type: "" | ImportExportOrderType;
  from: string;
  to: string;
}

type ToastState = {
  message: string;
  type: "success" | "error";
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const EMPTY_FILTERS: WorklistFilters = {
  order_type: "",
  from: "",
  to: "",
};

function toStartDate(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function toEndDate(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  date.setHours(23, 59, 59, 999);
  return date;
}

function hasInvalidDateRange(from: string, to: string): boolean {
  if (!from || !to) {
    return false;
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return false;
  }

  return fromDate.getTime() > toDate.getTime();
}

function mapBackendErrorMessage(error: unknown, fallback: string): string {
  const statusCode =
    error instanceof ImportExportOrderApiError ? error.statusCode : undefined;

  if (statusCode === 400) {
    return "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin nhập.";
  }

  if (statusCode === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }

  if (statusCode === 404) {
    return "Phiếu không tồn tại hoặc đã bị xóa.";
  }

  if (statusCode === 409) {
    return "Phiếu đã được xử lý hoặc tồn kho không đủ để xác nhận.";
  }

  if (typeof statusCode === "number" && statusCode >= 500) {
    return "Hệ thống đang bận, vui lòng thử lại.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export default function StockManagement() {
  const [draftFilters, setDraftFilters] =
    useState<WorklistFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<WorklistFilters>(EMPTY_FILTERS);
  const [orders, setOrders] = useState<ImportExportOrder[]>([]);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ImportExportOrder | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [confirmDrawerOpen, setConfirmDrawerOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [actionOrder, setActionOrder] = useState<ImportExportOrder | null>(
    null,
  );
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);
  const [isRejectSubmitting, setIsRejectSubmitting] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const loadWorklist = useCallback(
    async (nextPage: number, nextFilters: WorklistFilters): Promise<void> => {
      setLoading(true);
      setListError(null);

      const params: ImportExportOrderQueryParams = {
        page: nextPage,
        limit: DEFAULT_LIMIT,
        order_type: nextFilters.order_type || undefined,
        from: toStartDate(nextFilters.from),
        to: toEndDate(nextFilters.to),
      };

      try {
        const response = await fetchImportExportOrderWorklist(params);
        setOrders(response.items);
        setTotal(response.total);
        setPage(response.page || nextPage);
      } catch (error) {
        const message = mapBackendErrorMessage(
          error,
          "Không thể tải worklist pending. Vui lòng thử lại.",
        );
        setListError(message);
        notify(message, "error");
        setOrders([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [notify],
  );

  useEffect(() => {
    void loadWorklist(DEFAULT_PAGE, EMPTY_FILTERS);
  }, [loadWorklist]);

  const handleApplyFilters = () => {
    const nextFilters = {
      ...draftFilters,
    };

    if (hasInvalidDateRange(nextFilters.from, nextFilters.to)) {
      const message =
        "Khoảng ngày không hợp lệ: 'Từ ngày' phải nhỏ hơn hoặc bằng 'Đến ngày'.";
      setListError(message);
      notify(message, "error");
      return;
    }

    setFilters(nextFilters);
    setPage(DEFAULT_PAGE);
    setListError(null);
    setToast(null);
    void loadWorklist(DEFAULT_PAGE, nextFilters);
  };

  const handleResetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(DEFAULT_PAGE);
    setToast(null);
    void loadWorklist(DEFAULT_PAGE, EMPTY_FILTERS);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || loading) {
      return;
    }

    void loadWorklist(nextPage, filters);
  };

  const openDetail = async (orderId: string) => {
    setDetailDrawerOpen(true);
    setSelectedOrder(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const detail = await fetchImportExportOrderDetail(orderId);
      setSelectedOrder(detail);
    } catch (error) {
      const message = mapBackendErrorMessage(
        error,
        "Không thể tải chi tiết phiếu.",
      );
      setDetailError(message);
      notify(message, "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailDrawer = () => {
    setDetailDrawerOpen(false);
    setSelectedOrder(null);
    setDetailError(null);
  };

  const closeConfirmDrawer = () => {
    if (isConfirmSubmitting) {
      return;
    }

    setConfirmDrawerOpen(false);
    setConfirmError(null);
    setActionOrder(null);
  };

  const closeRejectModal = () => {
    if (isRejectSubmitting) {
      return;
    }

    setRejectModalOpen(false);
    setRejectError(null);
    setActionOrder(null);
  };

  const openConfirm = async (orderId: string) => {
    setConfirmError(null);
    setRejectError(null);
    setDetailDrawerOpen(false);

    try {
      const detail = await fetchImportExportOrderDetail(orderId);

      if (detail.status !== "PendingConfirmation") {
        notify("Phiếu đã được xử lý trước đó.", "error");
        await loadWorklist(page, filters);
        return;
      }

      setActionOrder(detail);
      setConfirmDrawerOpen(true);
    } catch (error) {
      const message = mapBackendErrorMessage(
        error,
        "Không thể tải dữ liệu phiếu để xác nhận.",
      );
      notify(message, "error");
    }
  };

  const openReject = async (orderId: string) => {
    setConfirmError(null);
    setRejectError(null);
    setDetailDrawerOpen(false);

    try {
      const detail = await fetchImportExportOrderDetail(orderId);

      if (detail.status !== "PendingConfirmation") {
        notify("Phiếu đã được xử lý trước đó.", "error");
        await loadWorklist(page, filters);
        return;
      }

      setActionOrder(detail);
      setRejectModalOpen(true);
    } catch (error) {
      const message = mapBackendErrorMessage(
        error,
        "Không thể tải dữ liệu phiếu để từ chối.",
      );
      notify(message, "error");
    }
  };

  const handleConfirmOrder = async (
    payload: ConfirmImportExportOrderPayload,
  ) => {
    if (!actionOrder) {
      return;
    }

    setIsConfirmSubmitting(true);
    setConfirmError(null);

    try {
      const updated = await confirmImportExportOrder(
        actionOrder.order_id,
        payload,
      );
      notify(`Đã xác nhận phiếu ${updated.order_id} thành công.`, "success");
      closeConfirmDrawer();
      await loadWorklist(page, filters);
    } catch (error) {
      const message = mapBackendErrorMessage(
        error,
        "Không thể xác nhận phiếu. Vui lòng thử lại.",
      );
      setConfirmError(message);
      notify(message, "error");
    } finally {
      setIsConfirmSubmitting(false);
    }
  };

  const handleRejectOrder = async (reason: string) => {
    if (!actionOrder) {
      return;
    }

    setIsRejectSubmitting(true);
    setRejectError(null);

    try {
      const updated = await rejectImportExportOrder(actionOrder.order_id, {
        reason,
      });
      notify(`Đã từ chối phiếu ${updated.order_id}.`, "success");
      closeRejectModal();
      await loadWorklist(page, filters);
    } catch (error) {
      const message = mapBackendErrorMessage(
        error,
        "Không thể từ chối phiếu. Vui lòng thử lại.",
      );
      setRejectError(message);
      notify(message, "error");
    } finally {
      setIsRejectSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="space-y-5">
        <header className="rounded-lg bg-linear-to-br from-emerald-600 to-emerald-700 px-5 py-6 text-white shadow-md">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
            Manager / US25
          </p>
          <h1 className="mt-2 text-3xl font-black">
            Worklist xác nhận nhập/xuất kho
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-emerald-100">
            Theo dõi toàn bộ phiếu PendingConfirmation và xử lý xác nhận/từ chối
            theo quyền Manager.
          </p>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Loại phiếu
              <select
                value={draftFilters.order_type}
                onChange={(event) =>
                  setDraftFilters((previous) => ({
                    ...previous,
                    order_type: event.target
                      .value as WorklistFilters["order_type"],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Tất cả loại phiếu</option>
                <option value="Inbound">Inbound</option>
                <option value="Outbound">Outbound</option>
              </select>
            </label>

            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Từ ngày
              <input
                type="date"
                value={draftFilters.from}
                onChange={(event) =>
                  setDraftFilters((previous) => ({
                    ...previous,
                    from: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Đến ngày
              <input
                type="date"
                value={draftFilters.to}
                onChange={(event) =>
                  setDraftFilters((previous) => ({
                    ...previous,
                    to: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Áp dụng
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {listError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {listError}
          </p>
        ) : null}

        <OrderWorklistTable
          orders={orders}
          loading={loading}
          page={page}
          limit={DEFAULT_LIMIT}
          total={total}
          onPageChange={handlePageChange}
          onViewDetail={(orderId) => {
            void openDetail(orderId);
          }}
          onConfirmOrder={(orderId) => {
            void openConfirm(orderId);
          }}
          onRejectOrder={(orderId) => {
            void openReject(orderId);
          }}
        />

        {/* Warehouse slip list merged into the main worklist; removed duplicate table. */}
      </div>

      <OrderDetailDrawer
        key={selectedOrder?.order_id ?? "manager-order-detail-drawer"}
        open={detailDrawerOpen}
        order={selectedOrder}
        loading={detailLoading}
        submitting={false}
        errorMessage={detailError}
        isEditing={false}
        onToggleEdit={() => {}}
        onClose={closeDetailDrawer}
        onSave={async () => {}}
      />

      <ConfirmOrderDrawer
        key={`manager-confirm-${actionOrder?.order_id ?? "none"}`}
        open={confirmDrawerOpen}
        order={actionOrder}
        submitting={isConfirmSubmitting}
        errorMessage={confirmError}
        onClose={closeConfirmDrawer}
        onSubmit={handleConfirmOrder}
      />

      <RejectOrderModal
        key={`manager-reject-${actionOrder?.order_id ?? "none"}`}
        open={rejectModalOpen}
        orderId={actionOrder?.order_id}
        submitting={isRejectSubmitting}
        errorMessage={rejectError}
        onClose={closeRejectModal}
        onSubmit={handleRejectOrder}
      />

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
