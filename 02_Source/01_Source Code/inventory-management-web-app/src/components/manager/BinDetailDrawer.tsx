import { useEffect, useState } from "react";
import { BinAPI } from "../../services/bin.service";

export default function BinDetailDrawer({
  binCode,
  onClose,
  onNotify,
}: {
  binCode: string;
  onClose: () => void;
  onNotify?: (message: string, type: "success" | "error") => void;
}) {
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<any[]>([]);
  const [countsTotal, setCountsTotal] = useState(0);
  const [countsPage, setCountsPage] = useState(1);
  const [countsLimit] = useState(5);
  const [selectedCount, setSelectedCount] = useState<any | null>(null);
  const [entries, setEntries] = useState<
    {
      lot_id?: string;
      material_id?: string;
      counted_qty: number;
      notes?: string;
    }[]
  >([]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binCode]);

  async function load() {
    setLoading(true);
    try {
      const { bin } = await BinAPI.getBinDetails(binCode);
      setLots(bin?.lots || []);
      setEntries(
        (bin?.lots || []).map((l: any) => ({
          lot_id: l.lot_id,
          material_id: l.material_id,
          counted_qty: l.quantity || 0,
        })),
      );
      // counts are loaded by separate effect
    } finally {
      setLoading(false);
    }
  }

  async function loadCounts(page: number) {
    try {
      const res = await BinAPI.fetchCounts(binCode, { page, limit: countsLimit });
      if (!res.error) {
        setCounts(res.items || []);
        setCountsTotal(res.total || 0);
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    // load counts when binCode or page changes
    if (!binCode) return;
    void loadCounts(countsPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binCode, countsPage]);

  const countsStart = countsTotal === 0 ? 0 : (countsPage - 1) * countsLimit + 1;
  const countsEnd = countsTotal === 0 ? 0 : Math.min(countsPage * countsLimit, countsTotal);

  function updateEntry(idx: number, value: Partial<(typeof entries)[0]>) {
    setEntries((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...value } : p)),
    );
  }

  async function submit() {
    // validation
    for (const e of entries) {
      if (e.counted_qty == null || Number.isNaN(Number(e.counted_qty))) {
        (onNotify ?? ((m: string) => alert(m)))(
          "Vui lòng nhập số lượng kiểm đếm hợp lệ cho tất cả các dòng.",
          "error",
        );
        return;
      }
      if (Number(e.counted_qty) < 0) {
        (onNotify ?? ((m: string) => alert(m)))(
          "Số lượng kiểm đếm phải >= 0.",
          "error",
        );
        return;
      }
    }

    const userStr =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;
    let countedBy = "unknown";
    try {
      if (userStr) {
        const u = JSON.parse(userStr);
        countedBy = u.username || u.user || u.name || "unknown";
      }
    } catch {}

    const payload = { counted_by: countedBy, notes: "", entries };

    try {
      const { result, error } = await BinAPI.submitCounts(binCode, payload);
      if (error) {
        (onNotify ?? ((m: string) => alert(m)))(
          "Gửi kết quả thất bại: " + (error.message || ""),
          "error",
        );
        return;
      }
      (onNotify ?? ((m: string) => alert(m)))(
        "Gửi kết quả thành công.",
        "success",
      );
      onClose();
    } catch (err: any) {
      (onNotify ?? ((m: string) => alert(m)))(
        "Lỗi hệ thống khi gửi kết quả.",
        "error",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[720px] bg-white shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">Bin: {binCode}</h3>
          <button onClick={onClose} className="text-sm text-gray-600">
            Close
          </button>
        </div>

        <div className="p-4">
          {loading && <div>Loading...</div>}
          {!loading && (
            <div>
              {/* Counts history */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2">
                  Lịch sử kiểm đếm (gần nhất)
                </h4>
                {counts.length === 0 && (
                  <div className="text-sm text-gray-500">
                    Chưa có bản ghi kiểm đếm.
                  </div>
                )}
                {counts.length > 0 && (
                  <table className="w-full table-auto mb-2">
                    <thead className="text-left text-sm text-gray-600">
                      <tr>
                        <th className="px-2 py-1">Ngày</th>
                        <th className="px-2 py-1">Người</th>
                        <th className="px-2 py-1">Expected</th>
                        <th className="px-2 py-1">Counted</th>
                        <th className="px-2 py-1">Delta%</th>
                        <th className="px-2 py-1">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {counts.map((c: any) => (
                        <tr
                          key={c._id}
                          className="border-t cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedCount(c)}
                        >
                          <td className="px-2 py-1 text-sm">
                            {new Date(c.counted_at).toLocaleString()}
                          </td>
                          <td className="px-2 py-1 text-sm">{c.counted_by}</td>
                          <td className="px-2 py-1 text-sm">{c.expected_total}</td>
                          <td className="px-2 py-1 text-sm">{c.counted_total}</td>
                          <td className="px-2 py-1 text-sm">{c.delta_pct}</td>
                          <td className="px-2 py-1 text-sm">{c.flag_review ? "YES" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {/* counts pagination */}
                <div className="flex items-center justify-between text-sm">
                  <div>
                    {countsTotal === 0 ? (
                      <span>Showing 0 of 0</span>
                    ) : (
                      <span>
                        Showing {countsStart} - {countsEnd} of {countsTotal}
                      </span>
                    )}
                  </div>
                  <div className="space-x-2">
                    <button
                      disabled={countsPage <= 1}
                      onClick={() => setCountsPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-1 border rounded"
                    >
                      Prev
                    </button>
                    <button
                      disabled={countsPage * countsLimit >= countsTotal}
                      onClick={() => setCountsPage((p) => p + 1)}
                      className="px-2 py-1 border rounded"
                    >
                      Next
                    </button>
                  </div>
                </div>
                {/* selected count details */}
                {selectedCount && (
                  <div className="mt-3 p-2 border rounded bg-gray-50">
                    <h5 className="font-medium mb-2">Chi tiết bản ghi kiểm đếm</h5>
                    <div className="text-sm text-gray-600 mb-2">Recorded by: {selectedCount.counted_by} — {new Date(selectedCount.counted_at).toLocaleString()}</div>
                    <table className="w-full table-auto mb-2">
                      <thead className="text-left text-sm text-gray-600">
                        <tr>
                          <th className="px-2 py-1">Lot</th>
                          <th className="px-2 py-1">Material</th>
                          <th className="px-2 py-1">Expected</th>
                          <th className="px-2 py-1">Counted</th>
                          <th className="px-2 py-1">Unit</th>
                          <th className="px-2 py-1">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedCount.entries || []).map((e: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1 text-sm">{e.lot_id}</td>
                            <td className="px-2 py-1 text-sm">{e.material_name ?? e.material_id}</td>
                            <td className="px-2 py-1 text-sm">{e.expected_qty}</td>
                            <td className="px-2 py-1 text-sm">{e.counted_qty}</td>
                            <td className="px-2 py-1 text-sm">{e.unit_of_measure ?? '—'}</td>
                            <td className="px-2 py-1 text-sm">{e.notes ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-right">
                      <button onClick={() => setSelectedCount(null)} className="px-3 py-1 border rounded text-sm">Close</button>
                    </div>
                  </div>
                )}
              </div>
              <table className="w-full table-auto">
                <thead className="text-left text-sm text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Lot</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2">Expected</th>
                    <th className="px-3 py-2">Counted</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((l: any, i: number) => (
                    <tr key={l.lot_id} className="border-t">
                      <td className="px-3 py-2">{l.lot_id}</td>
                      <td className="px-3 py-2">{l.material_id}</td>
                      <td className="px-3 py-2">{l.quantity}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={entries[i]?.counted_qty ?? 0}
                          onChange={(e) =>
                            updateEntry(i, {
                              counted_qty: Number(e.target.value),
                            })
                          }
                          className="w-24 rounded border px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={entries[i]?.notes ?? ""}
                          onChange={(e) =>
                            updateEntry(i, { notes: e.target.value })
                          }
                          className="w-full rounded border px-2 py-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  className="px-4 py-2 bg-emerald-600 text-white rounded"
                >
                  Submit counts
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
