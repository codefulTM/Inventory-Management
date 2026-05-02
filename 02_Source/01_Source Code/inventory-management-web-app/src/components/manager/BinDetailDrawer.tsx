/**
 * Component BinDetailDrawer
 * Drawer (thanh trượt bên phải) hiển thị chi tiết vị trí kệ (bin) cho quản lý (Manager role)
 * Cho phép xem lịch sử kiểm đếm, nhập số lượng thực tế và gửi kết quả kiểm kê
 */
import { useEffect, useState } from "react";
import { BinAPI } from "../../services/bin.service";

/** Props cho component BinDetailDrawer */
export default function BinDetailDrawer({
  binCode,
  onClose,
  onNotify,
}: {
  /** Mã vị trí kệ cần hiển thị chi tiết */
  binCode: string;
  /** Hàm callback khi đóng drawer */
  onClose: () => void;
  /** Hàm callback để hiển thị thông báo (success/error) */
  onNotify?: (message: string, type: "success" | "error") => void;
}) {
  // State lưu danh sách lô hàng trong bin
  const [lots, setLots] = useState<any[]>([]);
  // State trạng thái đang tải dữ liệu
  const [loading, setLoading] = useState(false);
  // State lưu lịch sử kiểm đếm của bin
  const [counts, setCounts] = useState<any[]>([]);
  // State tổng số bản ghi kiểm đếm
  const [countsTotal, setCountsTotal] = useState(0);
  // State trang hiện tại của lịch sử kiểm đếm
  const [countsPage, setCountsPage] = useState(1);
  // State số lượng bản ghi mỗi trang (cố định 5)
  const [countsLimit] = useState(5);
  // State lưu bản ghi kiểm đếm đang được chọn để xem chi tiết
  const [selectedCount, setSelectedCount] = useState<any | null>(null);
  // State lưu các dòng nhập liệu kiểm đếm thực tế (số lượng đếm được, ghi chú)
  const [entries, setEntries] = useState<
    {
      lot_id?: string;
      material_id?: string;
      counted_qty: number;
      notes?: string;
    }[]
  >([]);

  // Load dữ liệu bin khi binCode thay đổi
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binCode]);

  /** Hàm tải thông tin chi tiết bin từ API */
  async function load() {
    setLoading(true);
    try {
      const { bin } = await BinAPI.getBinDetails(binCode);
      // Lấy danh sách lô hàng trong bin
      setLots(bin?.lots || []);
      // Khởi tạo entries với số lượng hiện tại làm mặc định số lượng đếm được
      setEntries(
        (bin?.lots || []).map((l: any) => ({
          lot_id: l.lot_id,
          material_id: l.material_id,
          counted_qty: l.quantity || 0,
        })),
      );
      // Lịch sử kiểm đếm được tải riêng bởi useEffect khác
    } finally {
      setLoading(false);
    }
  }

  /** Hàm tải lịch sử kiểm đếm của bin theo trang */
  async function loadCounts(page: number) {
    try {
      const res = await BinAPI.fetchCounts(binCode, { page, limit: countsLimit });
      if (!res.error) {
        setCounts(res.items || []);
        setCountsTotal(res.total || 0);
      }
    } catch (e) {
      // Bỏ qua lỗi khi tải lịch sử
    }
  }

  // Tải lịch sử kiểm đếm khi binCode hoặc trang thay đổi
  useEffect(() => {
    if (!binCode) return;
    void loadCounts(countsPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binCode, countsPage]);

  // Tính toán phạm vi hiển thị cho phân trang lịch sử kiểm đếm
  const countsStart = countsTotal === 0 ? 0 : (countsPage - 1) * countsLimit + 1;
  const countsEnd = countsTotal === 0 ? 0 : Math.min(countsPage * countsLimit, countsTotal);

  /** Hàm cập nhật thông tin một dòng nhập liệu kiểm đếm */
  function updateEntry(idx: number, value: Partial<(typeof entries)[0]>) {
    setEntries((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...value } : p)),
    );
  }

  /** Hàm gửi kết quả kiểm đếm lên server */
  async function submit() {
    // Validate số lượng kiểm đếm cho từng dòng
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

    // Lấy thông tin người dùng từ localStorage để ghi nhận người kiểm đếm
    const userStr =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;
    let countedBy = "unknown";
    try {
      if (userStr) {
        const u = JSON.parse(userStr);
        countedBy = u.username || u.user || u.name || "unknown";
      }
    } catch {}

    // Tạo payload gửi lên API chứa thông tin người kiểm đếm và các dòng kiểm đếm
    const payload = { counted_by: countedBy, notes: "", entries };

    // Gửi dữ liệu kiểm đếm lên server thông qua BinAPI
    try {
      const { result, error } = await BinAPI.submitCounts(binCode, payload);
      if (error) {
        (onNotify ?? ((m: string) => alert(m)))(
          "Gửi kết quả thất bại: " + (error.message || ""),
          "error",
        );
        return;
      }
      // Thông báo thành công và đóng drawer
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
    // Overlay toàn màn hình, click vào vùng bên trái để đóng drawer
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1" onClick={onClose} />
      {/* Drawer hiển thị bên phải màn hình */}
      <div className="w-[720px] bg-white shadow-xl">
        {/* Header của drawer */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">Bin: {binCode}</h3>
          <button onClick={onClose} className="text-sm text-gray-600">
            Đóng
          </button>
        </div>

        <div className="p-4">
          {/* Hiển thị trạng thái đang tải */}
          {loading && <div>Đang tải...</div>}
          {!loading && (
            <div>
              {/* PHẦN LỊCH SỬ KIỂM ĐẾM */}
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
                   // Bảng hiển thị lịch sử kiểm đếm
                   <table className="w-full table-auto mb-2">
                     <thead className="text-left text-sm text-gray-600">
                       <tr>
                         <th className="px-2 py-1">Ngày</th>
                         <th className="px-2 py-1">Người</th>
                         <th className="px-2 py-1">Dự kiến</th>
                         <th className="px-2 py-1">Thực tế</th>
                         <th className="px-2 py-1">Sai lệch %</th>
                         <th className="px-2 py-1">Cờ</th>
                       </tr>
                     </thead>
                     <tbody>
                       {counts.map((c: any) => (
                         // Click vào dòng để xem chi tiết bản ghi kiểm đếm
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
                           <td className="px-2 py-1 text-sm">{c.flag_review ? "CÓ" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                 {/* PHÂN TRANG LỊCH SỬ KIỂM ĐẾM */}
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
                 {/* HIỂN THỊ CHI TIẾT BẢN GHI KIỂM ĐẾM ĐANG CHỌN */}
                 {selectedCount && (
                   <div className="mt-3 p-2 border rounded bg-gray-50">
                     <h5 className="font-medium mb-2">Chi tiết bản ghi kiểm đếm</h5>
                     <div className="text-sm text-gray-600 mb-2">Người ghi nhận: {selectedCount.counted_by} — {new Date(selectedCount.counted_at).toLocaleString()}</div>
                    <table className="w-full table-auto mb-2">
                       <thead className="text-left text-sm text-gray-600">
                         <tr>
                           <th className="px-2 py-1">Mã lô</th>
                           <th className="px-2 py-1">Vật tư</th>
                           <th className="px-2 py-1">Dự kiến</th>
                           <th className="px-2 py-1">Thực tế</th>
                           <th className="px-2 py-1">ĐVT</th>
                           <th className="px-2 py-1">Ghi chú</th>
                         </tr>
                       </thead>
                      <tbody>
                         {/* Hiển thị từng dòng chi tiết trong bản ghi kiểm đếm */}
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
                         <button onClick={() => setSelectedCount(null)} className="px-3 py-1 border rounded text-sm">Đóng</button>
                       </div>
                  </div>
                )}
              </div>
               {/* BẢNG NHẬP SỐ LƯỢNG KIỂM ĐẾM THỰC TẾ */}
               <table className="w-full table-auto">
                 <thead className="text-left text-sm text-gray-600">
                   <tr>
                     <th className="px-3 py-2">Mã lô</th>
                     <th className="px-3 py-2">Vật tư</th>
                     <th className="px-3 py-2">Dự kiến</th>
                     <th className="px-3 py-2">Thực tế</th>
                     <th className="px-3 py-2">Ghi chú</th>
                   </tr>
                 </thead>
                <tbody>
                 {/* Map qua từng lô hàng để hiển thị dòng nhập liệu */}
                 {lots.map((l: any, i: number) => (
                   <tr key={l.lot_id} className="border-t">
                     <td className="px-3 py-2">{l.lot_id}</td>
                     <td className="px-3 py-2">{l.material_id}</td>
                     <td className="px-3 py-2">{l.quantity}</td>
                     <td className="px-3 py-2">
                       {/* Input nhập số lượng thực tế đếm được */}
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
                       {/* Input ghi chú cho từng lô */}
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

               {/* CÁC NÚT HÀNH ĐỘNG */}
               <div className="mt-4 flex justify-end gap-2">
                 <button onClick={onClose} className="px-4 py-2 border rounded">
                   Hủy
                 </button>
                 <button
                   onClick={submit}
                   className="px-4 py-2 bg-emerald-600 text-white rounded"
                 >
                   Gửi kết quả kiểm đếm
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
