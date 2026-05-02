/**
 * Trang quản lý lô hàng (Inventory Lot Management Page)
 * Chức năng chính:
 * - Hiển thị danh sách lô hàng với phân trang
 * - Tìm kiếm lô hàng theo mã hoặc nhà sản xuất
 * - Xem chi tiết, chỉnh sửa, thêm mới lô hàng (qua modal)
 * - Điều chỉnh số lượng tồn kho (inventory adjustment)
 * - Xem lịch sử điều chỉnh gần đây (khi ở route /manager/stock)
 * 
 * Phân quyền: Chỉ Manager mới có quyền chỉnh sửa và điều chỉnh
 */
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Toast from "../../../components/Toast";
import InventoryAdjustmentForm from "../../../components/manager/inventory-adjustment/InventoryAdjustmentForm";
import {
  createInventoryAdjustment,
  fetchInventoryAdjustments,
  InventoryAdjustmentApiError,
} from "../../../services/inventoryAdjustmentService";
import {
  InventoryLotAPI,
  type InventoryLot,
} from "../../../services/inventory-lot.service";
import {
  INVENTORY_ADJUSTMENT_REASON_LABELS,
  type CreateInventoryAdjustmentRequest,
  type InventoryAdjustmentItem,
} from "../../../types/inventoryAdjustment";
import { handleApiError, logApiError } from "../../../utils/error-handler";
import { getCurrentUser } from "../../../services/apiClient";
import {
  SearchAndFilters,
  InventoryLotTable,
  DetailModal,
  EditModal,
  AddModal,
  LoadingAndError,
} from "./components";
import { type EditFormValues } from "./utils/types";

/** Kiểu dữ liệu cho thông báo toast */
type ToastState = {
  message: string;
  type: "success" | "error";
};

/**
 * Chuyển đổi lỗi API thành thông báo tiếng Việt thân thiện
 * @param error - Lỗi từ API (có thể là InventoryAdjustmentApiError hoặc Error thông thường)
 * @returns Chuỗi thông báo lỗi tiếng Việt tương ứng với mã trạng thái HTTP
 */
function toAdjustmentErrorMessage(error: unknown): string {
  const statusCode =
    error instanceof InventoryAdjustmentApiError ? error.statusCode : undefined;

  if (statusCode === 400) {
    return "Dữ liệu điều chỉnh không hợp lệ. Vui lòng kiểm tra lại.";
  }

  if (statusCode === 403) {
    return "Bạn không có quyền điều chỉnh tồn kho.";
  }

  if (statusCode === 404) {
    return "Không tìm thấy lô hàng để điều chỉnh.";
  }

  if (statusCode === 409) {
    return "Điều chỉnh không hợp lệ vì làm âm tồn kho.";
  }

  if (typeof statusCode === "number" && statusCode >= 500) {
    return "Hệ thống đang bận, vui lòng thử lại sau.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Không thể điều chỉnh tồn kho. Vui lòng thử lại.";
}

/** Component trang quản lý lô hàng chính */
export default function InventoryLot() {
  // Lấy thông tin route hiện tại để xác định có hiển thị phần điều chỉnh kho hay không
  const location = useLocation();
  const isStockRoute = location.pathname.startsWith("/manager/stock");
  
  // Lấy thông tin người dùng hiện tại để kiểm tra quyền Manager
  const currentUser = getCurrentUser();
  const isManager = currentUser?.role === "Manager";

  // State cho tìm kiếm lô hàng
  const [searchTerm, setSearchTerm] = useState("");
  // State cho lô hàng đang được chọn để xem/sửa
  const [selectedInventoryLot, setSelectedInventoryLot] =
    useState<InventoryLot | null>(null);
  // State điều khiển các modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  // State danh sách lô hàng và trạng thái tải
  const [inventoryLots, setInventoryLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State lỗi khi submit form thêm/sửa
  const [submitError, setSubmitError] = useState<string | null>(null);
  // State phân trang
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  // State cho phần điều chỉnh tồn kho
  const [isAdjustmentSubmitting, setIsAdjustmentSubmitting] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  // State lịch sử điều chỉnh
  const [adjustmentHistory, setAdjustmentHistory] = useState<
    InventoryAdjustmentItem[]
  >([]);
  const [isAdjustmentHistoryLoading, setIsAdjustmentHistoryLoading] =
    useState(false);
  const [adjustmentHistoryError, setAdjustmentHistoryError] = useState<
    string | null
  >(null);
  // State thông báo toast
  const [toast, setToast] = useState<ToastState | null>(null);

  /**
   * Hàm tải danh sách lô hàng từ API
   * @param query - Từ khóa tìm kiếm (nếu rỗng sẽ lấy tất cả)
   * @param pageToFetch - Số trang cần tải
   */
  const fetchInventoryLots = async (query: string, pageToFetch: number = 1) => {
    setError(null);

    const {
      inventoryLots,
      total,
      page: responsePage,
      error: apiError,
    } = query === ""
      ? await InventoryLotAPI.getAll(pageToFetch, limit)
      : await InventoryLotAPI.search(query, pageToFetch, limit);

    if (apiError) {
      const errorMsg = "Không thể tải dữ liệu hàng hóa";
      setError(errorMsg);
      setLoading(false);
      handleApiError(apiError);
      logApiError(apiError, "fetch_inventory_lots");
      return;
    }

    setInventoryLots(inventoryLots);
    setTotal(total ?? 0);
    setPage(responsePage ?? pageToFetch);
    setLoading(false);
  };

  // Tải lại danh sách lô hàng mỗi khi từ khóa tìm kiếm thay đổi
  useEffect(() => {
    setPage(1);
    fetchInventoryLots(searchTerm, 1);
  }, [searchTerm]);

  /**
   * Hàm tải lịch sử điều chỉnh kho gần đây
   * Chỉ tải 10 bản ghi mới nhất để hiển thị trong bảng lịch sử
   */
  const fetchRecentAdjustments = async () => {
    setAdjustmentHistoryError(null);
    setIsAdjustmentHistoryLoading(true);

    try {
      const response = await fetchInventoryAdjustments({
        page: 1,
        limit: 10,
      });
      setAdjustmentHistory(response.items);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải lịch sử điều chỉnh.";
      setAdjustmentHistoryError(message);
      setAdjustmentHistory([]);
    } finally {
      setIsAdjustmentHistoryLoading(false);
    }
  };

  // Tải lịch sử điều chỉnh khi ở route /manager/stock
  useEffect(() => {
    if (!isStockRoute) {
      return;
    }

    void fetchRecentAdjustments();
  }, [isStockRoute]);

  /** Mở modal xem chi tiết lô hàng */
  const handleViewDetail = (inventoryLot: InventoryLot) => {
    setSelectedInventoryLot(inventoryLot);
    setShowDetailModal(true);
  };

  /** Mở modal chỉnh sửa lô hàng (chỉ Manager) */
  const handleEditClick = (lot: InventoryLot) => {
    setSubmitError(null);
    setSelectedInventoryLot(lot);
    setShowEditModal(true);
  };

  /** Mở modal thêm mới lô hàng */
  const handleAddClick = () => {
    setSubmitError(null);
    setShowAddModal(true);
  };

  /**
   * Xử lý submit form chỉnh sửa lô hàng
   * Cập nhật thông tin lô hàng qua API và cập nhật state cục bộ
   */
  const handleEditSubmit = async (values: EditFormValues) => {
    setSubmitError(null);
    // Tạo đối tượng lô hàng đã cập nhật từ form values
    const updated: InventoryLot = {
      lot_id: values.lot_id,
      material_id: values.material_id,
      manufacturer_name: values.manufacturer_name,
      manufacturer_lot: values.manufacturer_lot,
      supplier_name: values.supplier_name,
      ...(values.manufacture_date
        ? { manufacture_date: values.manufacture_date }
        : {}),
      received_date: values.received_date,
      expiration_date: values.expiration_date,
      ...(values.in_use_expiration_date
        ? { in_use_expiration_date: values.in_use_expiration_date }
        : {}),
      status: values.status,
      quantity: values.quantity,
      unit_of_measure: values.unit_of_measure,
      storage_location: values.storage_location,
      warehouse_id: values.warehouse_id,
      is_sample: values.is_sample,
      parent_lot_id: values.parent_lot_id,
      notes: values.notes,
    };
    const { error: apiErr } = await InventoryLotAPI.update(
      updated.lot_id,
      updated,
    );
    if (apiErr) {
      setSubmitError("Lưu thất bại. Vui lòng thử lại.");
      return;
    }
    setInventoryLots((prev) =>
      prev.map((lot) => (lot.lot_id === updated.lot_id ? updated : lot)),
    );
    setShowEditModal(false);
  };

  /**
   * Xử lý submit form thêm mới lô hàng
   * Tạo lô hàng mới qua API và thêm vào danh sách hiển thị
   */
  const handleAddSubmit = async (values: EditFormValues) => {
    setSubmitError(null);
    // Tạo đối tượng lô hàng mới từ form values
    const newLot: InventoryLot = {
      lot_id: values.lot_id,
      material_id: values.material_id,
      manufacturer_name: values.manufacturer_name,
      manufacturer_lot: values.manufacturer_lot,
      supplier_name: values.supplier_name,
      ...(values.manufacture_date
        ? { manufacture_date: values.manufacture_date }
        : {}),
      received_date: values.received_date,
      expiration_date: values.expiration_date,
      ...(values.in_use_expiration_date
        ? { in_use_expiration_date: values.in_use_expiration_date }
        : {}),
      status: values.status,
      quantity: values.quantity,
      unit_of_measure: values.unit_of_measure,
      storage_location: values.storage_location,
      warehouse_id: values.warehouse_id,
      is_sample: values.is_sample,
      parent_lot_id: values.parent_lot_id,
      notes: values.notes,
    };
    const { error: apiErr } = await InventoryLotAPI.create(newLot);
    if (apiErr) {
      setSubmitError("Thêm mới thất bại. Vui lòng thử lại.");
      return;
    }
    setInventoryLots((prev) => [newLot, ...prev]);
    setShowAddModal(false);
  };

  /**
   * Xử lý tạo phiếu điều chỉnh tồn kho
   * Gọi API tạo adjustment, hiển thị toast kết quả và tải lại dữ liệu
   */
  const handleCreateAdjustment = async (
    payload: CreateInventoryAdjustmentRequest,
  ) => {
    setAdjustmentError(null);
    setIsAdjustmentSubmitting(true);

    try {
      const created = await createInventoryAdjustment(payload);
      setToast({
        type: "success",
        message: `Đã điều chỉnh lô ${created.lot_after.lot_id}: ${created.lot_before.quantity} -> ${created.lot_after.quantity}.`,
      });
      await fetchInventoryLots(searchTerm, page);
      await fetchRecentAdjustments();
    } catch (error) {
      const message = toAdjustmentErrorMessage(error);
      setAdjustmentError(message);
      setToast({ type: "error", message });
    } finally {
      setIsAdjustmentSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Loading & Error States */}
      <LoadingAndError
        isLoading={loading}
        error={error}
        onRetry={() => fetchInventoryLots(searchTerm, page)}
      />

      {/* Search and Filters */}
      {!loading && !isStockRoute && (
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAdd={handleAddClick}
        />
      )}

      {isStockRoute ? (
        <>
          <InventoryAdjustmentForm
            submitting={isAdjustmentSubmitting}
            onSubmit={handleCreateAdjustment}
          />
          {adjustmentError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {adjustmentError}
            </p>
          ) : null}

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wide text-gray-700">
                Lịch sử điều chỉnh gần đây
              </h3>
              <button
                type="button"
                onClick={() => {
                  void fetchRecentAdjustments();
                }}
                disabled={isAdjustmentHistoryLoading}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdjustmentHistoryLoading ? "Đang tải..." : "Làm mới"}
              </button>
            </div>

            {adjustmentHistoryError ? (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                {adjustmentHistoryError}
              </p>
            ) : null}

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-bold text-gray-600">
                      Thời gian
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-bold text-gray-600">
                      Mã lô
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-bold text-gray-600">
                      Mã vật tư
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-right font-bold text-gray-600">
                      Điều chỉnh
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-right font-bold text-gray-600">
                      Trước {"->"} Sau
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-bold text-gray-600">
                      Lý do
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-bold text-gray-600">
                      Người thực hiện
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {adjustmentHistory.map((item) => (
                    <tr key={item.adjustment_id}>
                      <td className="border-b border-gray-100 px-3 py-2 text-gray-700">
                        {item.created_date
                          ? new Date(item.created_date).toLocaleString("vi-VN")
                          : "-"}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2 font-semibold text-gray-800">
                        {item.lot_id}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2 text-gray-700">
                        {item.material_id}
                      </td>
                      <td
                        className={`border-b border-gray-100 px-3 py-2 text-right font-bold ${
                          item.adjustment_quantity > 0
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {item.adjustment_quantity > 0 ? "+" : ""}
                        {item.adjustment_quantity}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2 text-right text-gray-700">
                        {item.quantity_before} {"->"} {item.quantity_after}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2 text-gray-700">
                        {INVENTORY_ADJUSTMENT_REASON_LABELS[item.reason_code] ??
                          item.reason_code}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2 text-gray-700">
                        {item.performed_by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isAdjustmentHistoryLoading && adjustmentHistory.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">
                Chưa có bản ghi điều chỉnh gần đây.
              </p>
            ) : null}
          </section>
        </>
      ) : null}

      {/* Inventory Lots Table */}
      {!isStockRoute && (
        <>
          <InventoryLotTable
            lots={inventoryLots}
            onViewDetail={handleViewDetail}
            onEdit={handleEditClick}
          />

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 bg-white p-4 rounded-xl border border-gray-100">
            <span className="text-sm text-gray-600">
              Hiển thị {inventoryLots.length} / {total} bản ghi
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (page > 1) {
                    const nextPage = page - 1;
                    setPage(nextPage);
                    fetchInventoryLots(searchTerm, nextPage);
                  }
                }}
                disabled={page <= 1 || loading}
                className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <span className="text-sm text-gray-700">
                Trang {page} / {Math.max(1, Math.ceil(total / limit))}
              </span>
              <button
                onClick={() => {
                  const maxPage = Math.max(1, Math.ceil(total / limit));
                  if (page < maxPage) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchInventoryLots(searchTerm, nextPage);
                  }
                }}
                disabled={
                  page >= Math.max(1, Math.ceil(total / limit)) || loading
                }
                className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <DetailModal
        isOpen={showDetailModal}
        selectedLot={selectedInventoryLot}
        onClose={() => setShowDetailModal(false)}
        onEdit={isManager ? handleEditClick : undefined}
      />

      <AddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSubmit}
        submitError={submitError}
      />

      <EditModal
        isOpen={showEditModal}
        selectedLot={selectedInventoryLot}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSubmit}
        submitError={submitError}
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
