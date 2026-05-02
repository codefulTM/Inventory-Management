// File: components/operator/import-export-order/OrderStatusBadge.tsx
// Component hiển thị trạng thái phiếu nhập/xuất kho
// Màu sắc: xanh (đã xác nhận), vàng (chờ), đỏ (từ chối)

import type { ImportExportOrderStatus } from "../../../types/importExportOrder";

interface OrderStatusBadgeProps {
  status: ImportExportOrderStatus;
}

// Cấu hình màu sắc và nhãn cho từng trạng thái
const STATUS_STYLE: Record<
  ImportExportOrderStatus,
  { label: string; className: string }
> = {
  PendingConfirmation: {
    label: "Chờ xác nhận",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  Confirmed: {
    label: "Đã xác nhận",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  Rejected: {
    label: "Từ chối",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.PendingConfirmation;

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${style.className}`}
    >
      {style.label}
    </span>
  );
}
