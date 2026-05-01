import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
// removed ImportExportOrder references; this table now uses WarehouseSlip data
import OrderStatusBadge from "./OrderStatusBadge";
import { fetchWarehouseSlips } from "../../../services/warehouseSlipService";
import type { WarehouseSlip } from "../../../types/warehouseSlip";
interface OrderWorklistTableProps {
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onViewDetail: (orderId: string) => void;
  onConfirmOrder: (orderId: string) => void;
  onRejectOrder: (orderId: string) => void;
  loading?: boolean;
  total?: number;
  filters?: any;
  reloadTrigger?: number;
}

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("vi-VN");
}

export default function OrderWorklistTable({
  loading = false,
  page,
  limit,
  onPageChange,
  onViewDetail,
  onConfirmOrder,
  onRejectOrder,
  total = 0,
  filters,
  reloadTrigger,
}: OrderWorklistTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // close menu on outside click
  useEffect(() => {
    function handleDocClick() {
      setOpenMenu(null);
      setMenuPosition(null);
    }

    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  const base =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/manager")
      ? "/manager"
      : "/operator";

  // Local data source: warehouse slips
  const [items, setItems] = useState<WarehouseSlip[]>([]);
  const [loadingLocal, setLoadingLocal] = useState<boolean>(false);
  const [totalLocal, setTotalLocal] = useState<number>(total ?? 0);
  // Reserved for future per-row processing states
  // const [processingIds, setProcessingIds] = useState<string[]>([]);

  const totalPages = Math.max(1, Math.ceil(totalLocal / limit));

  function mapSlipStatus(status?: string) {
    if (!status) return "PendingConfirmation";
    switch (status.toString().toUpperCase()) {
      case "CONFIRMED":
        return "Confirmed";
      case "REJECTED":
        return "Rejected";
      default:
        return "PendingConfirmation";
    }
  }

  async function loadData() {
    setLoadingLocal(true);
    try {
      // sanitize filters: remove empty-string or null/undefined entries
      const raw = filters || {};
      const cleaned: Record<string, any> = {};
      Object.entries(raw).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (typeof v === "string" && v.trim() === "") return;
        cleaned[k] = v;
      });
      // normalize legacy filter key `order_type` -> `type` expected by the API
      if (cleaned.order_type && !cleaned.type) {
        cleaned.type = cleaned.order_type;
        delete cleaned.order_type;
      }

      const params: any = { page, limit, ...cleaned };
      const res: any = await fetchWarehouseSlips(params);
      const dataItems: WarehouseSlip[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
          ? res.items
          : [];
      setItems(dataItems);
      setTotalLocal(
        typeof res?.total === "number" ? res.total : dataItems.length,
      );
    } catch (e) {
      // keep console log; parent handles user-facing notifications
      console.error("Failed to load warehouse slips", e);
      setItems([]);
      setTotalLocal(0);
    } finally {
      setLoadingLocal(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [page, limit, JSON.stringify(filters), reloadTrigger]);

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-md">
      <div className="overflow-x-auto" style={{ overflowY: "visible" }}>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">Mã phiếu</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Người tạo</th>
              <th className="px-4 py-3">Số dòng vật tư</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loadingLocal ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`worklist-skeleton-${index}`}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-24 animate-pulse rounded-full bg-gray-200" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-7 w-44 animate-pulse rounded bg-gray-200" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  Không tìm thấy phiếu kho để hiển thị.
                </td>
              </tr>
            ) : (
              items.map((slip) => (
                <tr
                  key={slip.slip_id}
                  className="transition hover:bg-indigo-50/40"
                >
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {slip.slip_number ?? slip.slip_id}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {slip.type === "IN" ? "Nhập kho" : "Xuất kho"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {slip.warehouse_id}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {slip.created_by || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {(slip.lines || []).length}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <OrderStatusBadge status={mapSlipStatus(slip.status)} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(slip.created_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onConfirmOrder?.(slip.slip_id)}
                          disabled={!(slip.status === "PENDING")}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-bold transition ${
                            slip.status === "PENDING"
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <CheckCircle2 size={14} />
                          Xác nhận
                        </button>

                        <button
                          type="button"
                          onClick={() => onRejectOrder?.(slip.slip_id)}
                          disabled={!(slip.status === "PENDING")}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-bold transition ${
                            slip.status === "PENDING"
                              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <XCircle size={14} />
                          Từ chối
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const btn = e.currentTarget as HTMLElement;
                            const rect = btn.getBoundingClientRect();
                            const MENU_WIDTH_PX = 176; // matches w-44
                            const margin = 8;
                            let left =
                              rect.right + window.scrollX - MENU_WIDTH_PX;
                            const minLeft = window.scrollX + margin;
                            const maxLeft =
                              window.scrollX +
                              window.innerWidth -
                              MENU_WIDTH_PX -
                              margin;
                            left = Math.max(minLeft, Math.min(left, maxLeft));
                            setMenuPosition({
                              top: rect.bottom + window.scrollY,
                              left,
                            });
                            setOpenMenu((prev) =>
                              prev === slip.slip_id ? null : slip.slip_id,
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                          title="Thêm"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>

                      {openMenu === slip.slip_id ? (
                        typeof document !== "undefined" && menuPosition ? (
                          createPortal(
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                top: menuPosition.top,
                                left: menuPosition.left,
                              }}
                              className="z-[9999] mt-2 w-44 overflow-hidden rounded-md border bg-white shadow-lg"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenu(null);
                                  setMenuPosition(null);
                                  onViewDetail?.(slip.slip_id);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-700 focus:text-gray-700 first:rounded-t-md last:rounded-b-md font-bold appearance-none bg-transparent"
                              >
                                Chi tiết
                              </button>

                              <Link
                                to={`${base}/in-out/${slip.slip_id}/print`}
                                onClick={() => {
                                  setOpenMenu(null);
                                  setMenuPosition(null);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-700 visited:text-gray-700 focus:text-gray-700 first:rounded-t-md last:rounded-b-md"
                              >
                                Preview
                              </Link>
                            </div>,
                            document.body,
                          )
                        ) : (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 z-[9999] mt-2 w-44 overflow-hidden rounded-md border bg-white shadow-lg"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenu(null);
                                onViewDetail?.(slip.slip_id);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:text-gray-700 first:rounded-t-md last:rounded-b-md font-bold appearance-none bg-transparent"
                            >
                              Chi tiết
                            </button>

                            <Link
                              to={`${base}/in-out/${slip.slip_id}/print`}
                              onClick={() => setOpenMenu(null)}
                              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-700 visited:text-gray-700 focus:text-gray-700 first:rounded-t-md last:rounded-b-md"
                            >
                              Preview
                            </Link>
                          </div>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
        <p>
          Trang {page}/{totalPages} - Tổng {totalLocal} phiếu pending
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={loading || page <= 1}
            className="rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Trước
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={loading || page >= totalPages}
            className="rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  );
}
