import { useCallback, useEffect, useState } from "react";
import Toast from "../../components/Toast";
import InventoryAdjustmentDetailDrawer from "../../components/manager/inventory-adjustment/InventoryAdjustmentDetailDrawer";
import InventoryAdjustmentForm from "../../components/manager/inventory-adjustment/InventoryAdjustmentForm";
import InventoryAdjustmentTable from "../../components/manager/inventory-adjustment/InventoryAdjustmentTable";
import {
  createInventoryAdjustment,
  fetchInventoryAdjustmentDetail,
  fetchInventoryAdjustments,
  InventoryAdjustmentApiError,
} from "../../services/inventoryAdjustmentService";
import type {
  CreateInventoryAdjustmentRequest,
  InventoryAdjustmentItem,
  InventoryAdjustmentListQuery,
} from "../../types/inventoryAdjustment";

type ToastState = {
  message: string;
  type: "success" | "error";
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const EMPTY_FILTERS: InventoryAdjustmentListQuery = {
  lot_id: "",
  material_id: "",
  reason_code: undefined,
  from: "",
  to: "",
};

function toStatusMessage(error: unknown, fallback: string): string {
  const statusCode =
    error instanceof InventoryAdjustmentApiError ? error.statusCode : undefined;

  if (statusCode === 400) {
    return "Dữ liệu điều chỉnh không hợp lệ, vui lòng kiểm tra lại.";
  }

  if (statusCode === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }

  if (statusCode === 404) {
    return "Không tìm thấy dữ liệu điều chỉnh hoặc lô hàng.";
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

  return fallback;
}

function hasInvalidDateRange(
  from?: string | Date,
  to?: string | Date,
): boolean {
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

export default function InventoryAdjustmentManager() {
  const [items, setItems] = useState<InventoryAdjustmentItem[]>([]);
  const [draftFilters, setDraftFilters] =
    useState<InventoryAdjustmentListQuery>(EMPTY_FILTERS);
  const [filters, setFilters] =
    useState<InventoryAdjustmentListQuery>(EMPTY_FILTERS);

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [total, setTotal] = useState(0);

  const [listLoading, setListLoading] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<InventoryAdjustmentItem | null>(
    null,
  );

  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const loadList = useCallback(
    async (
      targetPage: number,
      targetFilters: InventoryAdjustmentListQuery,
    ): Promise<void> => {
      setListLoading(true);
      setListError(null);

      try {
        const response = await fetchInventoryAdjustments({
          ...targetFilters,
          page: targetPage,
          limit: DEFAULT_LIMIT,
        });

        setItems(response.items);
        setPage(response.page || targetPage);
        setTotal(response.total || 0);
      } catch (error) {
        const message = toStatusMessage(
          error,
          "Không thể tải danh sách phiếu điều chỉnh.",
        );
        setListError(message);
        setItems([]);
        setTotal(0);
      } finally {
        setListLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadList(DEFAULT_PAGE, EMPTY_FILTERS);
  }, [loadList]);

  const handleCreate = async (payload: CreateInventoryAdjustmentRequest) => {
    setCreateSubmitting(true);

    try {
      const created = await createInventoryAdjustment(payload);
      notify(`Đã tạo phiếu điều chỉnh ${created.adjustment_id}.`, "success");

      await loadList(DEFAULT_PAGE, filters);
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError(null);

      try {
        const detail = await fetchInventoryAdjustmentDetail(
          created.adjustment_id,
        );
        setDetailItem(detail);
      } catch (detailErrorValue) {
        setDetailItem(null);
        setDetailError(
          toStatusMessage(
            detailErrorValue,
            "Không thể tải chi tiết phiếu vừa tạo.",
          ),
        );
      } finally {
        setDetailLoading(false);
      }
    } catch (error) {
      const message = toStatusMessage(error, "Không thể tạo phiếu điều chỉnh.");
      notify(message, "error");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleApplyFilters = () => {
    if (hasInvalidDateRange(draftFilters.from, draftFilters.to)) {
      const message =
        "Khoảng ngày không hợp lệ: Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.";
      setListError(message);
      notify(message, "error");
      return;
    }

    setFilters(draftFilters);
    setPage(DEFAULT_PAGE);
    void loadList(DEFAULT_PAGE, draftFilters);
  };

  const handleResetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(DEFAULT_PAGE);
    setListError(null);
    void loadList(DEFAULT_PAGE, EMPTY_FILTERS);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || listLoading) {
      return;
    }

    void loadList(nextPage, filters);
  };

  const handleViewDetail = async (adjustmentId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailItem(null);

    try {
      const detail = await fetchInventoryAdjustmentDetail(adjustmentId);
      setDetailItem(detail);
    } catch (error) {
      setDetailError(
        toStatusMessage(error, "Không thể tải chi tiết phiếu điều chỉnh."),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="space-y-5">
        <header className="rounded-lg bg-linear-to-br from-emerald-600 to-emerald-700 px-5 py-6 text-white shadow-md">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
            Manager / US10
          </p>
          <h1 className="mt-2 text-3xl font-black">
            Điều chỉnh số lượng tồn kho
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-emerald-100">
            Tạo và tra cứu phiếu điều chỉnh tồn kho, đồng thời theo dõi ảnh
            hưởng tới giá trị tồn kho theo chuẩn nghiệp vụ US10.
          </p>
        </header>

        <InventoryAdjustmentForm
          submitting={createSubmitting}
          onSubmit={handleCreate}
        />

        <InventoryAdjustmentTable
          items={items}
          loading={listLoading}
          errorMessage={listError}
          draftFilters={draftFilters}
          page={page}
          limit={DEFAULT_LIMIT}
          total={total}
          onDraftFilterChange={(changes) =>
            setDraftFilters((previous) => ({ ...previous, ...changes }))
          }
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          onPageChange={handlePageChange}
          onViewDetail={(adjustmentId) => {
            void handleViewDetail(adjustmentId);
          }}
        />
      </div>

      <InventoryAdjustmentDetailDrawer
        open={detailOpen}
        loading={detailLoading}
        errorMessage={detailError}
        item={detailItem}
        onClose={() => {
          setDetailOpen(false);
          setDetailError(null);
          setDetailItem(null);
        }}
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
