import { useEffect, useState } from "react";
import { BinAPI, type BinWorklistItem } from "../../services/bin.service";
import BinDetailDrawer from "../../components/manager/BinDetailDrawer";
import Toast from "../../components/Toast";
import BinEditModal from "../../components/manager/BinEditModal";

export default function BinWorklist() {
  const [items, setItems] = useState<BinWorklistItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedBin, setSelectedBin] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<{ bin_code: string; expected_qty?: number } | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function load() {
    setLoading(true);
    try {
      const { items: data, total: t } = await BinAPI.getWorklist({
        page,
        limit,
      });
      setItems(data || []);
      setTotal(t || 0);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: { bin_code: string; expected_qty?: number }) {
    const { result, error } = await BinAPI.createBin(payload);
    if (error) return setToast({ message: 'Tạo vị trí kệ thất bại.', type: 'error' });
    setToast({ message: 'Tạo vị trí kệ thành công.', type: 'success' });
    setEditModalOpen(false);
    load();
  }

  async function handleUpdate(bin_code: string, payload: { expected_qty?: number }) {
    const { result, error } = await BinAPI.updateBin(bin_code, payload);
    if (error) return setToast({ message: 'Cập nhật thất bại.', type: 'error' });
    setToast({ message: 'Cập nhật thành công.', type: 'success' });
    setEditingBin(null);
    setEditModalOpen(false);
    load();
  }

  async function handleDelete(bin_code: string) {
    if (!confirm(`Xác nhận xóa vị trí kệ ${bin_code}?`)) return;
    const { result, error } = await BinAPI.deleteBin(bin_code);
    if (error) return setToast({ message: 'Xóa thất bại.', type: 'error' });
    setToast({ message: 'Xóa thành công.', type: 'success' });
    load();
  }

  return (
    <div className="p-6">
      <header className="mb-4">
        <h2 className="text-2xl font-bold">Worklist kiểm kê theo vị trí kệ</h2>
      </header>

      <div className="flex items-center justify-between mb-3">
        <div />
        <div>
          <button
            onClick={() => {
              setEditingBin(null);
              setEditModalOpen(true);
            }}
            className="rounded bg-blue-600 px-3 py-1 text-white"
          >
            Thêm vị trí kệ
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full table-auto">
          <thead className="bg-gray-50 text-left text-sm text-gray-600">
            <tr>
              <th className="px-4 py-3">Mã vị trí kệ</th>
              <th className="px-4 py-3">Số lượng dự kiến</th>
              <th className="px-4 py-3">Số lô</th>
              <th className="px-4 py-3">Ngày kiểm gần nhất</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.bin_code} className="border-t">
                <td className="px-4 py-3">{it.bin_code}</td>
                <td className="px-4 py-3">{it.expected_qty ?? '-'}</td>
                <td className="px-4 py-3">{it.lots?.length ?? 0}</td>
                <td className="px-4 py-3">{it.last_count_date ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedBin(it.bin_code)}
                      className="rounded bg-emerald-600 px-3 py-1 text-white"
                    >
                      Mở
                    </button>
                    <button
                      onClick={() => {
                        setEditingBin({ bin_code: it.bin_code, expected_qty: it.expected_qty });
                        setEditModalOpen(true);
                      }}
                      className="rounded bg-yellow-500 px-3 py-1 text-white"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(it.bin_code)}
                      className="rounded bg-red-600 px-3 py-1 text-white"
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div>
          Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of{" "}
          {total}
        </div>
        <div className="space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded"
          >
            Prev
          </button>
          <button
            disabled={page * limit >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded"
          >
            Next
          </button>
        </div>
      </div>

      {selectedBin && (
        <BinDetailDrawer
          binCode={selectedBin}
          onClose={() => {
            setSelectedBin(null);
            load();
          }}
          onNotify={(message: string, type: "success" | "error") =>
            setToast({ message, type })
          }
        />
      )}

      <BinEditModal
        open={editModalOpen}
        initial={editingBin ?? undefined}
        onClose={() => {
          setEditModalOpen(false);
          setEditingBin(null);
        }}
        onSave={async (payload) => {
          if (editingBin) {
            await handleUpdate(editingBin.bin_code, { expected_qty: payload.expected_qty });
          } else {
            await handleCreate(payload);
          }
        }}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
