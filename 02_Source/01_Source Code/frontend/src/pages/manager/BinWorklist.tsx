import { useEffect, useState } from "react";
import { BinAPI, type BinWorklistItem } from "../../services/bin.service";
import BinDetailDrawer from "../../components/manager/BinDetailDrawer";

export default function BinWorklist() {
  const [items, setItems] = useState<BinWorklistItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedBin, setSelectedBin] = useState<string | null>(null);

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

  return (
    <div className="p-6">
      <header className="mb-4">
        <h2 className="text-2xl font-bold">Worklist kiểm kê theo vị trí kệ</h2>
      </header>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full table-auto">
          <thead className="bg-gray-50 text-left text-sm text-gray-600">
            <tr>
              <th className="px-4 py-3">Bin code</th>
              <th className="px-4 py-3">Expected qty</th>
              <th className="px-4 py-3"># Lots</th>
              <th className="px-4 py-3">Last modified</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.bin_code} className="border-t">
                <td className="px-4 py-3">{it.bin_code}</td>
                <td className="px-4 py-3">{it.expected_qty}</td>
                <td className="px-4 py-3">{it.lots?.length ?? 0}</td>
                <td className="px-4 py-3">{it.last_count_date ?? "-"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedBin(it.bin_code)}
                    className="rounded bg-emerald-600 px-3 py-1 text-white"
                  >
                    Open
                  </button>
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
        />
      )}
    </div>
  );
}
