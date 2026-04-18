import { CheckCircle2, Eye, XCircle } from "lucide-react";
import type { ImportExportOrder } from "../../../types/importExportOrder";
import OrderStatusBadge from "./OrderStatusBadge";

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
            {loading ? (
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
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  Không còn phiếu PendingConfirmation cần xử lý.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.order_id}
                  className="transition hover:bg-indigo-50/40"
                >
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {order.order_id}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {order.order_type === "Inbound" ? "Nhập kho" : "Xuất kho"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {order.warehouse_id}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {order.created_by || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {order.items.length}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDate(order.created_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onViewDetail(order.order_id)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        <Eye size={14} />
                        Chi tiết
                      </button>

                      <button
                        type="button"
                        onClick={() => onConfirmOrder(order.order_id)}
                        className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        <CheckCircle2 size={14} />
                        Xác nhận
                      </button>

                      <button
                        type="button"
                        onClick={() => onRejectOrder(order.order_id)}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                      >
                        <XCircle size={14} />
                        Từ chối
                      </button>
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
