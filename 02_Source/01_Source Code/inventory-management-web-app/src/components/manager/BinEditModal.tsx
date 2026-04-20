import { useState, useEffect } from 'react';

export default function BinEditModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (payload: { bin_code: string; expected_qty?: number }) => void;
  initial?: { bin_code: string; expected_qty?: number } | null;
}) {
  const [binCode, setBinCode] = useState('');
  const [expectedQty, setExpectedQty] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBinCode(initial?.bin_code ?? '');
      setExpectedQty(
        typeof initial?.expected_qty === 'number' ? initial!.expected_qty : '',
      );
    }
  }, [open, initial]);

  function validate(): string | null {
    if (!binCode || binCode.trim().length === 0) return 'Vui lòng nhập mã vị trí kệ.';
    if (expectedQty !== '' && (Number.isNaN(Number(expectedQty)) || Number(expectedQty) < 0)) return 'Số lượng dự kiến phải là số >= 0.';
    return null;
  }

  async function handleSave() {
    const v = validate();
    if (v) {
      alert(v);
      return;
    }
    setSaving(true);
    try {
      await onSave({ bin_code: binCode.trim(), expected_qty: expectedQty === '' ? undefined : Number(expectedQty) });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="bg-white rounded shadow-lg z-10 w-[520px] p-6">
        <h3 className="text-lg font-bold mb-4">{initial ? 'Chỉnh sửa vị trí kệ' : 'Thêm vị trí kệ'}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-bold">Mã vị trí kệ</label>
            <input
              value={binCode}
              onChange={(e) => setBinCode(e.target.value)}
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="Ví dụ: BIN-A-001"
              disabled={!!initial}
            />
          </div>
          <div>
            <label className="text-sm font-bold">Số lượng dự kiến</label>
            <input
              type="number"
              value={expectedQty as any}
              onChange={(e) => setExpectedQty(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="Để trống nếu không xác định"
              min={0}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-4 py-2 border rounded" onClick={onClose} disabled={saving}>
            Hủy
          </button>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
