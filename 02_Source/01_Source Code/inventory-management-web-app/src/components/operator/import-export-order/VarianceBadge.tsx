// File: components/operator/import-export-order/VarianceBadge.tsx
// Component hiển thị độ lệch (variance) giữa số lượng thực tế và dự kiến
// Màu sắc: xanh (âm = dư), vàng (dương = thiếu), xám (bằng 0)

interface VarianceBadgeProps {
  variance: number;
}

// Format số độ lệch: thêm dấu + cho số dương
function formatVariance(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (value > 0) {
    return `+${value}`;
  }

  return `${value}`;
}

export default function VarianceBadge({ variance }: VarianceBadgeProps) {
  const className =
    variance === 0
      ? "border-gray-200 bg-gray-50 text-gray-700"
      : variance > 0
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex min-w-16 justify-center rounded-full border px-2 py-1 text-xs font-bold ${className}`}
    >
      {formatVariance(variance)}
    </span>
  );
}
