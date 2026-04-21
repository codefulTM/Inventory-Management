import React, { useState, useEffect } from "react";
import type {
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
} from "../../../types/warehouse";
import warehouseService from "../../../services/warehouseService";
import Toast from "../../Toast";

interface Props {
  warehouseId?: string;
  onSaved?: (w: Warehouse) => void;
}

export const WarehouseForm: React.FC<Props> = ({ warehouseId, onSaved }) => {
  const [warehouseIdInput, setWarehouseIdInput] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: CreateWarehouseRequest | UpdateWarehouseRequest = {
        ...(warehouseId ? { warehouse_id: warehouseIdInput } : {}),
        warehouse_name: name,
        description,
        is_active: isActive,
      };
      const result = warehouseId
        ? await warehouseService.updateWarehouse(
            warehouseId,
            payload as UpdateWarehouseRequest,
          )
        : await warehouseService.createWarehouse(
            payload as CreateWarehouseRequest,
          );
      if (onSaved) onSaved(result);
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

          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-gray-800 text-sm">Tên kho</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2.5 border rounded-lg text-sm focus:border-blue-600 focus:ring-3 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-gray-800 text-sm">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-3 py-2.5 border rounded-lg text-sm focus:border-blue-600 focus:ring-3 focus:ring-blue-100"
              rows={4}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Đang hoạt động</label>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </div>

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
