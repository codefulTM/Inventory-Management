/**
 * Component BinEditModal
 * Modal thêm mới hoặc chỉnh sửa vị trí kệ (bin) trong kho
 * Cho phép nhập mã vị trí, số lượng dự kiến và chọn kho chứa
 */
import { useState, useEffect } from "react";
import { useWarehouseList } from "../../hooks";

/** Props cho component BinEditModal */
export default function BinEditModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  /** Trạng thái hiển thị modal (true: mở, false: đóng) */
  open: boolean;
  /** Hàm callback khi đóng modal */
  onClose: () => void;
  /** Hàm callback khi lưu dữ liệu, trả về payload chứa thông tin vị trí kệ */
  onSave: (payload: {
    bin_code: string;
    expected_qty?: number;
    warehouse_id?: string;
  }) => void;
  /** Dữ liệu ban đầu để chỉnh sửa (null nếu thêm mới) */
  initial?: {
    bin_code: string;
    expected_qty?: number;
    warehouse_id?: string;
  } | null;
}) {
  // Các state lưu trữ giá trị form
  const [binCode, setBinCode] = useState(""); // Mã vị trí kệ
  const [expectedQty, setExpectedQty] = useState<number | "">(""); // Số lượng dự kiến
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined); // ID kho chứa
  const [saving, setSaving] = useState(false); // Trạng thái đang lưu
  // Lấy danh sách kho từ API (trang 1, giới hạn 200 kho)
  const { warehouses } = useWarehouseList(1, 200);

  // Điền dữ liệu form khi mở modal (chỉnh sửa) hoặc reset khi đóng
  useEffect(() => {
    if (open) {
      // Lấy dữ liệu từ initial (nếu có) để điền vào form
      setBinCode(initial?.bin_code ?? "");
      setExpectedQty(
        typeof initial?.expected_qty === "number" ? initial!.expected_qty : "",
      );
      setWarehouseId(initial?.warehouse_id);
    }
  }, [open, initial]);

  /** Hàm kiểm tra tính hợp lệ của dữ liệu form */
  function validate(): string | null {
    // Kiểm tra mã vị trí kệ không được để trống
    if (!binCode || binCode.trim().length === 0)
      return "Vui lòng nhập mã vị trí kệ.";
    // Kiểm tra số lượng dự kiến phải là số không âm
    if (
      expectedQty !== "" &&
      (Number.isNaN(Number(expectedQty)) || Number(expectedQty) < 0)
    )
      return "Số lượng dự kiến phải là số >= 0.";
    return null;
  }

  /** Hàm xử lý lưu dữ liệu vị trí kệ */
  async function handleSave() {
    // Validate dữ liệu trước khi lưu
    const v = validate();
    if (v) {
      alert(v);
      return;
    }
    // Bắt đầu trạng thái đang lưu
    setSaving(true);
    try {
      // Gọi callback onSave với dữ liệu đã nhập
      await onSave({
        bin_code: binCode.trim(),
        expected_qty: expectedQty === "" ? undefined : Number(expectedQty),
        warehouse_id: warehouseId,
      });
    } finally {
      // Kết thúc trạng thái đang lưu dù thành công hay thất bại
      setSaving(false);
    }
  }

  // Không render gì nếu modal đóng
  if (!open) return null;
  return (
    {/* Lớp phủ mờ toàn màn hình, click để đóng modal */}
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Nội dung modal */}
      <div className="bg-white rounded shadow-lg z-10 w-[520px] p-6">
        {/* Tiêu đề modal: Thêm mới hoặc Chỉnh sửa */}
        <h3 className="text-lg font-bold mb-4">
          {initial ? "Chỉnh sửa vị trí kệ" : "Thêm vị trí kệ"}
        </h3>
        {/* Các trường nhập liệu */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-bold">Mã vị trí kệ</label>
            <input
              value={binCode}
              onChange={(e) => setBinCode(e.target.value)}
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="Ví dụ: BIN-A-001"
              disabled={!!initial} // Không cho sửa mã khi chỉnh sửa
            />
          </div>
          <div>
            <label className="text-sm font-bold">Số lượng dự kiến</label>
            <input
              type="number"
              value={expectedQty as any}
              onChange={(e) =>
                setExpectedQty(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="w-full border rounded px-3 py-2 mt-1"
              placeholder="Để trống nếu không xác định"
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-bold">Kho chứa</label>
            <select
              value={warehouseId ?? ""}
              onChange={(e) => setWarehouseId(e.target.value || undefined)}
              className="w-full border rounded px-3 py-2 mt-1"
            >
              <option value="">-- Chọn kho (không bắt buộc) --</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w.warehouse_id}>
                  {w.warehouse_id} - {w.warehouse_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Các nút hành động */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="px-4 py-2 border rounded"
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </button>
          <button
            className="px-4 py-2 bg-emerald-600 text-white rounded"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
