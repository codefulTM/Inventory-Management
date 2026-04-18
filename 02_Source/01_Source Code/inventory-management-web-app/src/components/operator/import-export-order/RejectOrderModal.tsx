import { useState } from "react";

interface RejectOrderModalProps {
  open: boolean;
  orderId?: string;
  submitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export default function RejectOrderModal({
  open,
  orderId,
  submitting = false,
  errorMessage,
  onClose,
  onSubmit,
}: RejectOrderModalProps) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleSubmit = async () => {
    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      setLocalError("Lý do từ chối là bắt buộc.");
      return;
    }

    if (normalizedReason.length > 255) {
      setLocalError("Lý do từ chối tối đa 255 ký tự.");
      return;
    }

    setLocalError(null);
    await onSubmit(normalizedReason);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">
            Từ chối phiếu
          </p>
          <h3 className="mt-1 text-lg font-black text-gray-900">
            {orderId ?? "-"}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Vui lòng nhập lý do từ chối để lưu vết xử lý.
          </p>
        </div>

        <div className="space-y-3 px-5 py-4">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-600">
            Lý do từ chối *
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              maxLength={255}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              placeholder="Nhập lý do từ chối"
            />
          </label>

          {localError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {localError}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={submitting}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Đang gửi..." : "Xác nhận từ chối"}
          </button>
        </div>
      </div>
    </div>
  );
}
