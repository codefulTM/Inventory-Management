import { useEffect, useState } from "react";
import { BinAPI } from "../../services/bin.service";

export default function BinDetailDrawer({
  binCode,
  onClose,
}: {
  binCode: string;
  onClose: () => void;
}) {
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
    } finally {
      setLoading(false);
    }
  }

  function updateEntry(idx: number, value: Partial<(typeof entries)[0]>) {
    setEntries((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...value } : p)),
    );
  }

  async function submit() {
    const payload = { counted_by: "current_user", notes: "", entries };
    const { result, error } = await BinAPI.submitCounts(binCode, payload);
    if (error) {
      alert("Submit failed: " + (error.message || ""));
      return;
    }
    alert("Submit success");
    onClose();
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
