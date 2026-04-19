import React, { useEffect, useState } from "react";
import { CheckCircle2, Eye, XCircle, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import type { ImportExportOrder } from "../../../types/importExportOrder";
import OrderStatusBadge from "./OrderStatusBadge";
import {
  fetchWarehouseSlips,
  approveWarehouseSlip,
  rejectWarehouseSlip,
} from "../../../services/warehouseSlipService";
import type { WarehouseSlip } from "../../../types/warehouseSlip";
import type { ImportExportOrderStatus } from "../../../types/importExportOrder";

interface OrderWorklistTableProps {
  orders: ImportExportOrder[];
  loading?: boolean;
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onViewDetail: (orderId: string) => void;
  onConfirmOrder: (orderId: string) => void;
  onRejectOrder: (orderId: string) => void;
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
  orders,
  loading = false,
  page,
  limit,
  total,
  onPageChange,
  onViewDetail,
  onConfirmOrder,
  onRejectOrder,
}: OrderWorklistTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // close menu on outside click
  useEffect(() => {
    function handleDocClick() {
      setOpenMenu(null);
    }

    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  const base =
    typeof window !== "undefined" && window.location.pathname.startsWith("/manager")
      ? "/manager"
      : "/operator";

  // Local data source: warehouse slips
  const [items, setItems] = useState<WarehouseSlip[]>([]);
  const [loadingLocal, setLoadingLocal] = useState<boolean>(false);
  const [totalLocal, setTotalLocal] = useState<number>(total ?? 0);
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  function mapSlipStatus(status?: string): ImportExportOrderStatus {
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
      const res: any = await fetchWarehouseSlips({ page, limit });
      const dataItems: WarehouseSlip[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
        ? res.items
        : [];
      setItems(dataItems);
      setTotalLocal(typeof res?.total === "number" ? res.total : dataItems.length);
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
  }, [page, limit]);

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-indigo-50 text-left text-xs font-bold uppercase tracking-wide text-indigo-700">
            <tr>
              <th className="px-4 py-3">Mã phiếu</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Người tạo</th>
              <th className="px-4 py-3">Số dòng vật tư</th>
              <th className="px-4 py-3">Trạng thái</th>
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
                  <td className="px-4 py-3 text-gray-700">{slip.warehouse_id}</td>
                  <td className="px-4 py-3 text-gray-700">{slip.created_by || "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{(slip.lines || []).length}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={mapSlipStatus(slip.status)} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(slip.created_date)}</td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`${base}/warehouse-slips/${slip.slip_id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                        >
                          <Eye size={14} />
                          Chi tiết
                        </Link>

                        <button
                          type="button"
                          onClick={async () => {
                            if (processingIds.includes(slip.slip_id)) return;
                            setProcessingIds((p) => [...p, slip.slip_id]);
                            try {
                              await approveWarehouseSlip(slip.slip_id);
                              await loadData();
                            } catch (e) {
                              console.error(e);
                              alert("Không thể xác nhận phiếu. Vui lòng thử lại.");
                            } finally {
                              setProcessingIds((p) => p.filter((id) => id !== slip.slip_id));
                            }
                          }}
                          disabled={processingIds.includes(slip.slip_id)}
                          className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 size={14} />
                          Xác nhận
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu((prev) => (prev === slip.slip_id ? null : slip.slip_id));
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                          title="Thêm"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>

                      {openMenu === slip.slip_id ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-md border bg-white shadow"
                        >
                          <button
                            type="button"
                            onClick={async () => {
                              setOpenMenu(null);
                              const reason = window.prompt("Lý do từ chối phiếu:");
                              if (!reason) return;
                              try {
                                await rejectWarehouseSlip(slip.slip_id, reason);
                                await loadData();
                              } catch (e) {
                                console.error(e);
                                alert("Không thể từ chối phiếu. Vui lòng thử lại.");
                              }
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-rose-700 hover:bg-gray-50"
                          >
                            Từ chối
                          </button>

                          <Link
                            to={`${base}/warehouse-slips/${slip.slip_id}/print`}
                            onClick={() => setOpenMenu(null)}
                            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Preview
                          </Link>

                          <a
                            href={`/api/warehouse/slips/${slip.slip_id}/print`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setOpenMenu(null)}
                            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            In
                          </a>
                        </div>
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
          Trang {page}/{totalPages} - Tổng {total} phiếu pending
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
