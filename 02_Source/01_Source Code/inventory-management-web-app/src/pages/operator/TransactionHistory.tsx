/**
 * TransactionHistory Page (Operator)
 * Trang lịch sử giao dịch nhập/xuất kho dành cho Operator
 * 
 * Chức năng chính:
 * - Xem lịch sử các phiếu nhập/xuất kho (Import/Export Orders)
 * - Xem danh sách phiếu chờ xác nhận (Worklist - PendingConfirmation)
 * - Chuyển đổi giữa 2 chế độ: History (lịch sử) và Worklist (cần xử lý)
 * - Lọc phiếu theo trạng thái, loại phiếu, khoảng thời gian
 * - Xem chi tiết phiếu, chỉnh sửa, xác nhận hoặc từ chối phiếu
 * 
 * Luồng nghiệp vụ US24:
 * 1. Operator tạo phiếu (tại StockIn/StockOut) → PendingConfirmation
 * 2. Operator xem Worklist để biết phiếu cần xử lý
 * 3. Kiểm tra thực tế tại kho, sau đó xác nhận hoặc từ chối phiếu
 * 
 * Hai chế độ xem:
 * - History: Xem tất cả phiếu đã tạo, lọc theo trạng thái/ngày
 * - Worklist: Chỉ xem phiếu đang chờ xử lý (PendingConfirmation)
 */
import { useCallback, useEffect, useState } from "react";
import Toast from "../../components/Toast";
import ConfirmOrderDrawer from "../../components/operator/import-export-order/ConfirmOrderDrawer";
import OrderDetailDrawer from "../../components/operator/import-export-order/OrderDetailDrawer";
import OrderHistoryTable from "../../components/operator/import-export-order/OrderHistoryTable";
import OrderWorklistTable from "../../components/operator/import-export-order/OrderWorklistTable";
import RejectOrderModal from "../../components/operator/import-export-order/RejectOrderModal";
import {
  confirmImportExportOrder,
  fetchImportExportOrderDetail,
  fetchImportExportOrders,
  ImportExportOrderApiError,
  rejectImportExportOrder,
  updateImportExportOrder,
} from "../../services/importExportOrderService";
import {
  fetchWarehouseSlip,
  approveWarehouseSlip,
  rejectWarehouseSlip,
} from "../../services/warehouseSlipService";
import type {
  ImportExportOrder,
  ImportExportOrderQueryParams,
  RejectImportExportOrderPayload,
  ImportExportOrderStatus,
  ImportExportOrderType,
  UpdateImportExportOrderPayload,
} from "../../types/importExportOrder";

// Cấu hình bộ lọc tìm kiếm phiếu
interface HistoryFilters {
  status: "" | ImportExportOrderStatus;  // Trạng thái phiếu
  order_type: "" | ImportExportOrderType;  // Loại phiếu: Inbound/Outbound
  from: string;  // Từ ngày
  to: string;  // Đến ngày
}

// Kiểu dữ liệu cho thông báo toast
type ToastState = {
  message: string;
  type: "success" | "error";
};

// Chế độ xem: lịch sử hoặc danh sách chờ xử lý
type ViewMode = "history" | "worklist";

// Các hằng số cấu hình phân trang
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;  // Số phiếu mỗi trang
const EMPTY_FILTERS: HistoryFilters = {
  status: "",
  order_type: "",
  from: "",
  to: "",
};

// Chuyển đổi chuỗi ngày thành Date, đặt thời gian về 00:00:00.000
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

// Chuyển đổi chuỗi ngày thành Date, đặt thời gian về 23:59:59.999
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

// Kiểm tra khoảng ngày có hợp lệ không (from <= to)
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

// Ánh xạ mã lỗi từ backend sang thông báo tiếng Việt
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

export default function TransactionHistoryOperator() {
  // Chế độ xem hiện tại: history hoặc worklist
  const [viewMode, setViewMode] = useState<ViewMode>("history");
  // Bộ lọc nháp (chưa áp dụng)
  const [draftFilters, setDraftFilters] =
    useState<HistoryFilters>(EMPTY_FILTERS);
  // Bộ lọc đã áp dụng để tải dữ liệu
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS);
  // Danh sách phiếu
  const [orders, setOrders] = useState<ImportExportOrder[]>([]);
  // Phân trang
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [total, setTotal] = useState(0);
  // Trạng thái loading
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // State cho drawer chi tiết phiếu
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);  // Chế độ chỉnh sửa
  const [isSaving, setIsSaving] = useState(false);

  // State cho drawer xác nhận và modal từ chối
  const [confirmDrawerOpen, setConfirmDrawerOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [actionOrder, setActionOrder] = useState<any | null>();  // Phiếu đang thao tác
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);
  const [isRejectSubmitting, setIsRejectSubmitting] = useState(false);

  // State cho thông báo toast
  const [toast, setToast] = useState<ToastState | null>(null);
  // Trigger để reload worklist
  const [worklistReloadTrigger, setWorklistReloadTrigger] = useState<number>(0);

  // Hàm hiển thị thông báo
  const notify = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  // Kiểm tra có đang ở chế độ worklist không
  const isWorklistMode = viewMode === "worklist";

  // Tải danh sách phiếu theo chế độ và bộ lọc
  const loadOrders = useCallback(
    async (
      mode: ViewMode,
      nextPage: number,
      nextFilters: HistoryFilters,
    ): Promise<void> => {
      setLoading(true);
      setListError(null);

      const params: ImportExportOrderQueryParams = {
        page: nextPage,
        limit: DEFAULT_LIMIT,
        // Chỉ lọc theo trạng thái ở chế độ history
        status:
          mode === "history" ? nextFilters.status || undefined : undefined,
        order_type: nextFilters.order_type || undefined,
        from: toStartDate(nextFilters.from),
        to: toEndDate(nextFilters.to),
      };

      try {
        if (mode === "history") {
          // Tải lịch sử phiếu từ API
          const response = await fetchImportExportOrders(params);
          setOrders(response.items);
          setTotal(response.total);
          setPage(response.page || nextPage);
        } else {
          // Chế độ worklist: component con sẽ tự tải dữ liệu từ warehouseSlipService
          setOrders([]);
          setTotal(0);
          setPage(nextPage);
        }
      } catch (error) {
        const message = mapBackendErrorMessage(
          error,
          mode === "worklist"
            ? "Không thể tải danh sách chờ xử lý. Vui lòng thử lại."
            : "Không thể tải lịch sử phiếu. Vui lòng thử lại.",
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

  // Tải dữ liệu lần đầu khi component mount
  useEffect(() => {
    void loadOrders("history", DEFAULT_PAGE, EMPTY_FILTERS);
  }, [loadOrders]);

  // Chuyển đổi giữa chế độ history và worklist
  const handleSwitchMode = (nextMode: ViewMode) => {
    if (nextMode === viewMode) {
      return;
    }

    setViewMode(nextMode);
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(DEFAULT_PAGE);
    setToast(null);
    void loadOrders(nextMode, DEFAULT_PAGE, EMPTY_FILTERS);
  };

  // Mở drawer xem chi tiết phiếu (có thể ở chế độ chỉnh sửa)
  const openDetail = async (orderId: string, editMode = false) => {
    setDrawerOpen(true);
    setSelectedOrder(null);
    setDetailError(null);
    setDetailLoading(true);
    setIsEditing(false);

    try {
      // Tải chi tiết phiếu: worklist dùng warehouseSlip, history dùng importExportOrder
      const detail =
        viewMode === "worklist"
          ? await fetchWarehouseSlip(orderId)
          : await fetchImportExportOrderDetail(orderId);

      setSelectedOrder(detail as any);

      // Nếu ở chế độ chỉnh sửa, kiểm tra trạng thái phiếu
      if (editMode) {
        const statusOk =
          viewMode === "worklist"
            ? (detail as any).status === "PENDING"
            : (detail as any).status === "PendingConfirmation";

        if (statusOk) {
          setIsEditing(true);
        } else {
          notify(
            "Chỉ có thể chỉnh sửa phiếu ở trạng thái PendingConfirmation.",
            "error",
          );
        }
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

  // Áp dụng bộ lọc đã chọn
  const handleApplyFilters = () => {
    const nextFilters = {
      ...draftFilters,
    };

    // Kiểm tra khoảng ngày hợp lệ
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
    void loadOrders(viewMode, DEFAULT_PAGE, nextFilters);
  };

  // Reset bộ lọc về mặc định
  const handleResetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(DEFAULT_PAGE);
    setToast(null);
    void loadOrders(viewMode, DEFAULT_PAGE, EMPTY_FILTERS);
  };

  // Chuyển trang
  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || loading) {
      return;
    }

    void loadOrders(viewMode, nextPage, filters);
  };

  // Đóng drawer chi tiết
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedOrder(null);
    setDetailError(null);
    setIsEditing(false);
  };

  // Đóng drawer xác nhận
  const closeConfirmDrawer = () => {
    if (isConfirmSubmitting) {
      return;
    }

    setConfirmDrawerOpen(false);
    setConfirmError(null);
    setActionOrder(null);
  };

  // Đóng modal từ chối
  const closeRejectModal = () => {
    if (isRejectSubmitting) {
      return;
    }

    setRejectModalOpen(false);
    setRejectError(null);
    setActionOrder(null);
  };

  // Mở drawer xác nhận phiếu (chỉ khi phiếu đang ở trạng thái chờ)
  const openConfirm = async (orderId: string) => {
    setConfirmError(null);
    setRejectError(null);
    setIsEditing(false);
    setDrawerOpen(false);

    try {
      const detail =
        viewMode === "worklist"
          ? await fetchWarehouseSlip(orderId)
          : await fetchImportExportOrderDetail(orderId);

      const isPending =
        viewMode === "worklist"
          ? (detail as any).status === "PENDING"
          : (detail as any).status === "PendingConfirmation";

      if (!isPending) {
        notify("Phiếu đã được xử lý trước đó.", "error");
        return;
      }

      setActionOrder(detail as any);
      setConfirmDrawerOpen(true);
    } catch (error) {
      const message = mapBackendErrorMessage(
        error,
        "Không thể tải dữ liệu phiếu để xác nhận.",
      );
      notify(message, "error");
    }
  };

  // Mở modal từ chối phiếu (chỉ khi phiếu đang ở trạng thái chờ)
  const openReject = async (orderId: string) => {
    setConfirmError(null);
    setRejectError(null);
    setIsEditing(false);
    setDrawerOpen(false);

    try {
      const detail =
        viewMode === "worklist"
          ? await fetchWarehouseSlip(orderId)
          : await fetchImportExportOrderDetail(orderId);

      const isPending =
        viewMode === "worklist"
          ? (detail as any).status === "PENDING"
          : (detail as any).status === "PendingConfirmation";

      if (!isPending) {
        notify("Phiếu đã được xử lý trước đó.", "error");
        return;
      }

      setActionOrder(detail as any);
      setRejectModalOpen(true);
    } catch (error) {
      const message = mapBackendErrorMessage(
        error,
        "Không thể tải dữ liệu phiếu để từ chối.",
      );
      notify(message, "error");
    }
  };

  // Lưu chỉnh sửa phiếu (chỉ khi đang ở chế độ chỉnh sửa)
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
      await loadOrders(viewMode, page, filters);
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

  // Xác nhận phiếu (nhập/xuất kho thực tế)
  const handleConfirmOrder = async (payload?: any) => {
    if (!actionOrder) return;

    setIsConfirmSubmitting(true);
    setConfirmError(null);

    try {
      if (viewMode === "worklist") {
        // Xác nhận Warehouse Slip
        const updated = await approveWarehouseSlip(
          actionOrder.slip_id,
          payload as any,
        );
        notify(`Đã xác nhận phiếu ${updated.slip_id} thành công.`, "success");
        // Trigger reload worklist
        setWorklistReloadTrigger((s) => s + 1);
      } else {
        // Xác nhận Import/Export Order - cập nhật tồn kho
        const updated = await confirmImportExportOrder(
          actionOrder.order_id,
          payload,
        );
        notify(`Đã xác nhận phiếu ${updated.order_id} thành công.`, "success");
      }

      closeConfirmDrawer();
      await loadOrders(viewMode, page, filters);
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

  // Từ chối phiếu (không thực hiện nhập/xuất kho)
  const handleRejectOrder = async (reason: string) => {
    if (!actionOrder) return;

    setIsRejectSubmitting(true);
    setRejectError(null);

    try {
      if (viewMode === "worklist") {
        // Từ chối Warehouse Slip
        const updated = await rejectWarehouseSlip(actionOrder.slip_id, reason);
        notify(`Đã từ chối phiếu ${updated.slip_id}.`, "success");
        setWorklistReloadTrigger((s) => s + 1);
      } else {
        // Từ chối Import/Export Order
        const payload: RejectImportExportOrderPayload = { reason };
        const updated = await rejectImportExportOrder(
          actionOrder.order_id,
          payload,
        );
        notify(`Đã từ chối phiếu ${updated.order_id}.`, "success");
      }

      closeRejectModal();
      await loadOrders(viewMode, page, filters);
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
        <header className="rounded-lg bg-linear-to-br from-blue-600 to-blue-700 px-5 py-6 text-white shadow-md">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">
            Operator / US24-US25
          </p>
          <h1 className="mt-2 text-3xl font-black">
            {isWorklistMode
              ? "Công việc cần xác nhận nhập/xuất"
              : "Lịch sử nhập/xuất kho"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100">
            {isWorklistMode
              ? "Theo dõi danh sách phiếu PendingConfirmation để chuẩn bị xử lý xác nhận thực tế."
              : "Tra cứu phiếu đã tạo, xem chi tiết và chỉnh sửa phiếu ở trạng thái PendingConfirmation."}
          </p>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-md">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => handleSwitchMode("history")}
              className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                viewMode === "history"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Lịch sử
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode("worklist")}
              className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                viewMode === "worklist"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Worklist Pending
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
          <div
            className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
              isWorklistMode ? "xl:grid-cols-4" : "xl:grid-cols-5"
            }`}
          >
            {!isWorklistMode ? (
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
                  <option value="PendingConfirmation">
                    PendingConfirmation
                  </option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </label>
            ) : null}

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

        {isWorklistMode ? (
          <OrderWorklistTable
            loading={loading}
            page={page}
            limit={DEFAULT_LIMIT}
            onPageChange={handlePageChange}
            onViewDetail={(orderId) => {
              void openDetail(orderId, false);
            }}
            onConfirmOrder={(orderId) => {
              void openConfirm(orderId);
            }}
            onRejectOrder={(orderId) => {
              void openReject(orderId);
            }}
            filters={filters}
            reloadTrigger={worklistReloadTrigger}
          />
        ) : (
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
        )}
      </div>

      <OrderDetailDrawer
        key={
          isWorklistMode
            ? (selectedOrder?.slip_id ?? "order-detail-drawer")
            : (selectedOrder?.order_id ?? "order-detail-drawer")
        }
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

      <ConfirmOrderDrawer
        key={
          isWorklistMode
            ? `confirm-${actionOrder?.slip_id ?? "none"}`
            : `confirm-${actionOrder?.order_id ?? "none"}`
        }
        open={confirmDrawerOpen}
        order={actionOrder}
        submitting={isConfirmSubmitting}
        errorMessage={confirmError}
        onClose={closeConfirmDrawer}
        onSubmit={handleConfirmOrder}
      />

      <RejectOrderModal
        key={
          isWorklistMode
            ? `reject-${actionOrder?.slip_id ?? "none"}`
            : `reject-${actionOrder?.order_id ?? "none"}`
        }
        open={rejectModalOpen}
        orderId={isWorklistMode ? actionOrder?.slip_id : actionOrder?.order_id}
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
