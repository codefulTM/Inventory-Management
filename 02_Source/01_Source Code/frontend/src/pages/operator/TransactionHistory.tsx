import { useEffect, useState } from "react";
import Toast from "../../components/Toast";
import OrderDetailDrawer from "../../components/operator/import-export-order/OrderDetailDrawer";
import OrderHistoryTable from "../../components/operator/import-export-order/OrderHistoryTable";
import {
  fetchImportExportOrderDetail,
  fetchImportExportOrders,
  ImportExportOrderApiError,
  updateImportExportOrder,
} from "../../services/importExportOrderService";
import type {
  ImportExportOrder,
  ImportExportOrderQueryParams,
  ImportExportOrderStatus,
  ImportExportOrderType,
  UpdateImportExportOrderPayload,
} from "../../types/importExportOrder";

interface HistoryFilters {
  status: "" | ImportExportOrderStatus;
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
const EMPTY_FILTERS: HistoryFilters = {
  status: "",
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

  if (typeof statusCode === "number" && statusCode >= 500) {
    return "Hệ thống đang bận, vui lòng thử lại.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export default function TransactionHistoryOperator() {
  const [draftFilters, setDraftFilters] =
    useState<HistoryFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS);
  const [orders, setOrders] = useState<ImportExportOrder[]>([]);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ImportExportOrder | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const loadOrders = async (
    nextPage: number,
    nextFilters: HistoryFilters,
  ): Promise<void> => {
    setLoading(true);
    setListError(null);

    const params: ImportExportOrderQueryParams = {
      page: nextPage,
      limit: DEFAULT_LIMIT,
      status: nextFilters.status || undefined,
      order_type: nextFilters.order_type || undefined,
      from: toStartDate(nextFilters.from),
      to: toEndDate(nextFilters.to),
    };

    try {
      const response = await fetchImportExportOrders(params);
      setOrders(response.items);
      setTotal(response.total);
      setPage(response.page || nextPage);
    } catch (error) {
      const message = mapBackendErrorMessage(
        error,
        "Không thể tải lịch sử phiếu. Vui lòng thử lại.",
      );
      setListError(message);
      notify(message, "error");
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders(DEFAULT_PAGE, EMPTY_FILTERS);
  }, []);

  const openDetail = async (orderId: string, editMode = false) => {
    setDrawerOpen(true);
    setSelectedOrder(null);
    setDetailError(null);
    setDetailLoading(true);
    setIsEditing(false);

    try {
      const detail = await fetchImportExportOrderDetail(orderId);
      setSelectedOrder(detail);

      if (editMode && detail.status === "PendingConfirmation") {
        setIsEditing(true);
      } else if (editMode) {
        notify(
          "Chỉ có thể chỉnh sửa phiếu ở trạng thái PendingConfirmation.",
          "error",
        );
      }
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

  const handleApplyFilters = () => {
    const nextFilters = {
      ...draftFilters,
    };

    setFilters(nextFilters);
    setPage(DEFAULT_PAGE);
    setToast(null);
    void loadOrders(DEFAULT_PAGE, nextFilters);
  };

  const handleResetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(DEFAULT_PAGE);
    setToast(null);
    void loadOrders(DEFAULT_PAGE, EMPTY_FILTERS);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || loading) {
      return;
    }

    void loadOrders(nextPage, filters);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedOrder(null);
    setDetailError(null);
    setIsEditing(false);
  };

  const handleSaveOrder = async (payload: UpdateImportExportOrderPayload) => {
    if (!selectedOrder) {
      return;
    }

    setIsSaving(true);
    setDetailError(null);

    try {
      const updated = await updateImportExportOrder(
        selectedOrder.order_id,
        payload,
      );
      setSelectedOrder(updated);
      setIsEditing(false);
      notify(`Đã cập nhật phiếu ${updated.order_id} thành công.`, "success");
      await loadOrders(page, filters);
    } catch (error) {
      const message = mapBackendErrorMessage(
        error,
        "Không thể cập nhật phiếu. Vui lòng thử lại.",
      );
      setDetailError(message);
      notify(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="space-y-5">
        <header className="rounded-lg bg-linear-to-br from-blue-600 to-blue-700 px-5 py-6 text-white shadow-md">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">
            Operator / US24
          </p>
          <h1 className="mt-2 text-3xl font-black">Lịch sử nhập/xuất kho</h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100">
            Tra cứu phiếu đã tạo, xem chi tiết và chỉnh sửa phiếu ở trạng thái
            PendingConfirmation.
          </p>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Trạng thái
              <select
                value={draftFilters.status}
                onChange={(event) =>
                  setDraftFilters((previous) => ({
                    ...previous,
                    status: event.target.value as HistoryFilters["status"],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PendingConfirmation">PendingConfirmation</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </label>

            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Loại phiếu
              <select
                value={draftFilters.order_type}
                onChange={(event) =>
                  setDraftFilters((previous) => ({
                    ...previous,
                    order_type: event.target
                      .value as HistoryFilters["order_type"],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

        <OrderHistoryTable
          orders={orders}
          loading={loading}
          page={page}
          limit={DEFAULT_LIMIT}
          total={total}
          onPageChange={handlePageChange}
          onViewDetail={(orderId) => {
            void openDetail(orderId, false);
          }}
          onEditOrder={(orderId) => {
            void openDetail(orderId, true);
          }}
        />
      </div>

      <OrderDetailDrawer
        key={selectedOrder?.order_id ?? "order-detail-drawer"}
        open={drawerOpen}
        order={selectedOrder}
        loading={detailLoading}
        submitting={isSaving}
        errorMessage={detailError}
        isEditing={isEditing}
        onToggleEdit={setIsEditing}
        onClose={handleCloseDrawer}
        onSave={handleSaveOrder}
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
