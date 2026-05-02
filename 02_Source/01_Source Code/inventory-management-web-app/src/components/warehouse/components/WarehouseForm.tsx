// File: components/warehouse/components/WarehouseForm.tsx
// Form tạo mới hoặc chỉnh sửa thông tin kho
// Nếu có warehouseId: chế độ chỉnh sửa, ngược lại là tạo mới
// Gọi warehouseService để create/update và hiển thị toast kết quả

import React, { useState, useEffect } from "react";
import type {
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
} from "../../../types/warehouse";
import warehouseService from "../../../services/warehouseService";
import Toast from "../../Toast";

// Props cho WarehouseForm
interface Props {
  warehouseId?: string; // ID kho (nếu có thì update, không thì create)
  onSaved?: (w: Warehouse) => void; // Callback khi lưu thành công
}

export const WarehouseForm: React.FC<Props> = ({ warehouseId, onSaved }) => {
  // State form
  const [warehouseIdInput, setWarehouseIdInput] = useState(""); // Mã kho (chỉ nhập khi tạo mới)
  const [name, setName] = useState(""); // Tên kho
  const [description, setDescription] = useState(""); // Mô tả
  const [isActive, setIsActive] = useState(true); // Trạng thái hoạt động
  const [loading, setLoading] = useState(false); // Đang xử lý
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Nếu có warehouseId, load thông tin kho để edit
  useEffect(() => {
    let mounted = true;
    if (warehouseId) {
      setLoading(true);
      warehouseService
        .fetchWarehouse(warehouseId)
        .then((w) => {
          if (!mounted) return;
          setWarehouseIdInput(w.warehouse_id);
          setName(w.warehouse_name);
          setDescription(w.description || "");
          setIsActive(Boolean(w.is_active));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
    return () => {
      mounted = false;
    };
  }, [warehouseId]);

  // Xử lý submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Payload cho create hoặc update
      const payload: CreateWarehouseRequest | UpdateWarehouseRequest = {
        ...(warehouseId ? { warehouse_id: warehouseIdInput } : {}),
        warehouse_name: name,
        description,
        is_active: isActive,
      };

      // Gọi API tương ứng
      const result = warehouseId
        ? await warehouseService.updateWarehouse(
            warehouseId,
            payload as UpdateWarehouseRequest,
          )
        : await warehouseService.createWarehouse(
            payload as CreateWarehouseRequest,
          );

      if (onSaved) onSaved(result);

      // Hiển thị toast thành công
      setToast({
        message: warehouseId ? "Cập nhật kho thành công" : "Tạo kho thành công",
        type: "success",
      });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Lỗi khi lưu kho";
      setToast({ message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-7">
        <h2 className="m-0 mb-5 text-2xl text-gray-800">
          {warehouseId ? "Cập nhật kho" : "Tạo kho"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Mã kho - chỉ cho phép sửa khi tạo mới */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-gray-800 text-sm">Mã kho</label>
            {warehouseId ? (
              <input
                value={warehouseIdInput}
                onChange={(e) => setWarehouseIdInput(e.target.value)}
                className="px-3 py-2.5 border rounded-lg text-sm focus:border-blue-600 focus:ring-3 focus:ring-blue-100"
                placeholder="VD: WH-001"
              />
            ) : (
              <div className="px-3 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 italic">
                Tự động sinh bởi hệ thống (WH-xxx)
              </div>
            )}
          </div>

          {/* Tên kho */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-gray-800 text-sm">Tên kho</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2.5 border rounded-lg text-sm focus:border-blue-600 focus:ring-3 focus:ring-blue-100"
            />
          </div>

          {/* Mô tả */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-gray-800 text-sm">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-3 py-2.5 border rounded-lg text-sm focus:border-blue-600 focus:ring-3 focus:ring-blue-100"
              rows={4}
            />
          </div>

          {/* Trạng thái hoạt động */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Đang hoạt động</label>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </div>

          {/* Nút hành động */}
          <div className="flex gap-3 mt-2.5">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm cursor-pointer transition-all hover:bg-blue-700 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex-1"
            >
              {loading
                ? "Đang xử lý..."
                : warehouseId
                  ? "Cập nhật kho"
                  : "Tạo kho"}
            </button>
            <button
              type="button"
              className="px-5 py-2.5 bg-gray-100 text-gray-800 rounded-lg font-bold text-sm cursor-pointer transition-all hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => {
                setWarehouseIdInput("");
                setName("");
                setDescription("");
                setIsActive(true);
              }}
              disabled={loading}
            >
              {warehouseId ? "Hủy" : "Đặt lại"}
            </button>
          </div>
        </form>
      </div>

      {/* Toast thông báo */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default WarehouseForm;
