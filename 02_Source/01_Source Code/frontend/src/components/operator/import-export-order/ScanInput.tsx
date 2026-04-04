import { useState } from "react";
import type { ImportExportOrderType } from "../../../types/importExportOrder";

interface ScanRowOption {
  value: number;
  label: string;
}

interface ScanInputProps {
  orderType: ImportExportOrderType;
  disabled?: boolean;
  isResolving?: boolean;
  rowOptions: ScanRowOption[];
  selectedRow: number;
  onSelectedRowChange: (index: number) => void;
  onResolve: (scanCode: string, rowIndex: number) => Promise<void>;
  statusMessage?: string;
  warningMessage?: string;
}

export default function ScanInput({
  orderType,
  disabled = false,
  isResolving = false,
  rowOptions,
  selectedRow,
  onSelectedRowChange,
  onResolve,
  statusMessage,
  warningMessage,
}: ScanInputProps) {
  const [scanCode, setScanCode] = useState("");

  const handleResolve = async () => {
    const normalized = scanCode.trim();
    if (!normalized) {
      return;
    }

    await onResolve(normalized, selectedRow);
  };

  const scanPlaceholder =
    orderType === "Inbound"
      ? "VD: MAT-001 hoặc PART-001"
      : "VD: LOT-001 hoặc manufacturer lot";

  return (
    <section className="rounded-lg bg-white p-5 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-700">
          Quét mã để điền nhanh
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 lg:col-span-2">
          Mã quét
          <input
            value={scanCode}
            onChange={(event) => setScanCode(event.target.value)}
            placeholder={scanPlaceholder}
            disabled={disabled || isResolving}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
          />
        </label>

        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">
          Ghi vào dòng
          <select
            value={selectedRow}
            onChange={(event) =>
              onSelectedRowChange(Number(event.target.value))
            }
            disabled={disabled || isResolving}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
          >
            {rowOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleResolve}
            disabled={disabled || isResolving || !scanCode.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResolving ? "Đang tra mã..." : "Tra mã"}
          </button>
        </div>
      </div>

      {statusMessage ? (
        <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
          {statusMessage}
        </p>
      ) : null}

      {warningMessage ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
          {warningMessage}
        </p>
      ) : null}
    </section>
  );
}
