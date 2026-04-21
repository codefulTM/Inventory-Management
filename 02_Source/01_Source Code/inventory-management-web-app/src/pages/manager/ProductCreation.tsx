import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Eye,
  FlaskConical,
  Package,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  updateProductionBatch,
  fetchProductionBatches,
  createProductionBatch,
} from "../../services/productionBatchService";
import { fetchMaterials } from "../../services/materialService";
import { fetchInventoryLots } from "../../services/inventoryLotService";
import { apiClient } from "../../services/apiClient";
import type { Material } from "../../types/material";
import type { ProductionBatch, BatchStatus } from "../../types/production";
import type { InventoryLot } from "../../types/inventory";

const BATCH_STATUS_LIST: BatchStatus[] = [
  "In Progress",
  "Complete",
  "On Hold",
  "Cancelled",
];

function statusLabel(status: string) {
  switch (status) {
    case "On Hold":
      return { label: "Chờ xử lý", cls: "bg-yellow-100 text-yellow-700" };
    case "In Progress":
      return { label: "Đang xử lý", cls: "bg-blue-100 text-blue-700" };
    case "Complete":
      return { label: "Hoàn thành", cls: "bg-green-100 text-green-700" };
    case "Cancelled":
      return { label: "Hủy", cls: "bg-red-100 text-red-700" };
    default:
      return { label: status, cls: "bg-gray-100 text-gray-500" };
  }
}

// ─── MANAGER DETAIL MODAL with Status Transition ─────────────────────────────

interface ProductionBatchDetailModalProps {
  batch: ProductionBatch;
  onClose: () => void;
  onUpdated: () => void;
  isManager?: boolean;
}

function ProductionBatchDetailModal({
  batch,
  onClose,
  onUpdated,
  isManager,
}: ProductionBatchDetailModalProps) {
  const [form, setForm] = useState<any>({ ...batch });
  const [batchComponents, setBatchComponents] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [inventoryLots, setInventoryLots] = useState<InventoryLot[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [newComponents, setNewComponents] = useState<any[]>([
    { lot_id: "", planned_quantity: "" },
  ]);
  const [showStatusTransition, setShowStatusTransition] = useState(false);
  const [newStatus, setNewStatus] = useState<BatchStatus | "">(batch.status);
  const [transitionError, setTransitionError] = useState("");

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev: any) => ({ ...prev, [key]: e.target.value }));
    };

  const setComponent =
    (idx: number, key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const updated = [...newComponents];
      updated[idx] = { ...updated[idx], [key]: e.target.value };
      setNewComponents(updated);
    };

  const addComponent = () => {
    setNewComponents((prev) => [...prev, { lot_id: "", planned_quantity: "" }]);
  };

  const removeComponent = (idx: number) => {
    setNewComponents((prev) => prev.filter((_: any, i: number) => i !== idx));
  };

  // Load batch components, inventory lots and materials on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [components, lots, mats] = await Promise.all([
          apiClient.get(`/production-batches/${batch.batch_id}/components`),
          fetchInventoryLots(),
          fetchMaterials(),
        ]);
        setBatchComponents(
          Array.isArray(components) ? components : components.data || [],
        );
        setInventoryLots(lots);
        setMaterials(mats);
      } catch (e) {
        console.error("Error loading data:", e);
      }
    };
    load();
  }, [batch.batch_id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Update batch info
      await updateProductionBatch(form.batch_id, form);

      // Add new components
      for (const comp of newComponents) {
        if (comp.lot_id && comp.planned_quantity) {
          await apiClient.post(
            `/production-batches/${form.batch_id}/components`,
            {
              lot_id: comp.lot_id,
              planned_quantity: comp.planned_quantity,
            },
          );
        }
      }

      setIsEditing(false);
      onUpdated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusTransition = async () => {
    if (!newStatus || newStatus === batch.status) {
      setTransitionError("Vui lòng chọn trạng thái khác");
      return;
    }

    setSaving(true);
    setTransitionError("");
    try {
      await updateProductionBatch(batch.batch_id, { status: newStatus as any });
      setShowStatusTransition(false);
      onUpdated();
      onClose();
    } catch (e: any) {
      setTransitionError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const canEdit = batch.status === "On Hold";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-8 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-lg"
        >
          <X size={20} />
        </button>

        {/* Status Transition Modal (for Manager) */}
        {isManager && showStatusTransition && (
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-10">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4">
              <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <ArrowRight size={20} className="text-blue-600" />
                Chuyển Trạng Thái
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-bold text-gray-600 mb-2">
                    Trạng thái hiện tại:
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded text-sm font-bold ${statusLabel(batch.status).cls}`}
                  >
                    {statusLabel(batch.status).label}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Chuyển sang:
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value as BatchStatus)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">-- Chọn trạng thái --</option>
                    {BATCH_STATUS_LIST.map((s) => (
                      <option key={s} value={s} disabled={s === batch.status}>
                        {statusLabel(s).label}
                      </option>
                    ))}
                  </select>
                </div>
                {transitionError && (
                  <p className="text-sm text-red-600 font-bold">
                    {transitionError}
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowStatusTransition(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleStatusTransition}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Đang chuyển..." : "Chuyển"}
                </button>
              </div>
            </div>
          </div>
        )}

        <h3 className="text-xl font-black text-gray-900 mb-4">
          Chi tiết Production Batch
        </h3>
        <form
          onSubmit={handleSave}
          className="space-y-4 max-h-96 overflow-y-auto"
        >
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-3 border-b pb-4">
            <h4 className="text-sm font-bold text-gray-700 uppercase">
              Thông tin cơ bản
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                  Batch Number
                </label>
                <input
                  value={form.batch_number}
                  readOnly={!isEditing}
                  onChange={set("batch_number")}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${!isEditing ? "bg-gray-50" : ""}`}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                  Product ID
                </label>
                <input
                  value={form.product_id}
                  readOnly={!isEditing}
                  onChange={set("product_id")}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${!isEditing ? "bg-gray-50" : ""}`}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                  Batch Size
                </label>
                <input
                  value={form.batch_size}
                  type="number"
                  readOnly={!isEditing}
                  onChange={set("batch_size")}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${!isEditing ? "bg-gray-50" : ""}`}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                  Unit
                </label>
                <input
                  value={form.unit_of_measure}
                  readOnly={!isEditing}
                  onChange={set("unit_of_measure")}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${!isEditing ? "bg-gray-50" : ""}`}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                  Shelf Life Value
                </label>
                <input
                  value={form.shelf_life_value}
                  type="number"
                  readOnly={!isEditing}
                  onChange={set("shelf_life_value")}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${!isEditing ? "bg-gray-50" : ""}`}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                  Shelf Life Unit
                </label>
                <select
                  value={form.shelf_life_unit}
                  disabled={!isEditing}
                  onChange={set("shelf_life_unit")}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white ${!isEditing ? "opacity-60" : ""}`}
                >
                  <option value="day">Ngày</option>
                  <option value="month">Tháng</option>
                  <option value="year">Năm</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                  Status
                </label>
                <input
                  value={form.status}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Nguyên liệu sử dụng */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-700 uppercase">
                Batch Components (Nguyên Liệu)
              </h4>
              {isEditing && (
                <button
                  type="button"
                  onClick={addComponent}
                  className="flex items-center gap-1 px-3 py-1 text-blue-600 font-bold text-xs hover:bg-blue-50 rounded"
                >
                  <Plus size={14} />
                  THÊM
                </button>
              )}
            </div>

            {/* Display existing batch components */}
            {batchComponents.length > 0 && (
              <div className="mb-4">
                <h5 className="text-xs font-bold text-gray-600 mb-2 uppercase">
                  Nguyên liệu hiện tại
                </h5>
                <div className="space-y-2">
                  {batchComponents.map((comp: any) => {
                    const lot = inventoryLots.find(
                      (l) => l.lot_id === comp.lot_id,
                    );
                    const mat = lot
                      ? materials.find((m) => m.material_id === lot.material_id)
                      : null;
                    return (
                      <div
                        key={comp.component_id}
                        className="p-3 border border-gray-200 bg-gray-50 rounded-lg"
                      >
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                              Nguyên Liệu
                            </label>
                            <input
                              value={
                                mat?.material_name || lot?.lot_id || comp.lot_id
                              }
                              readOnly
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                              Lô Hàng
                            </label>
                            <input
                              value={lot?.manufacturer_lot || comp.lot_id}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                              Số lượng
                            </label>
                            <input
                              value={`${comp.planned_quantity} ${comp.unit_of_measure}`}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New components to add */}
            {isEditing && (
              <div>
                <h5 className="text-xs font-bold text-gray-600 mb-2 uppercase">
                  Thêm nguyên liệu mới
                </h5>
                <div className="space-y-2">
                  {newComponents.map((comp: any, idx: number) => {
                    return (
                      <div
                        key={idx}
                        className="p-3 border border-gray-300 bg-white rounded-lg"
                      >
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                              Lô Hàng
                            </label>
                            <select
                              value={comp.lot_id}
                              onChange={setComponent(idx, "lot_id")}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            >
                              <option value="">-- Chọn --</option>
                              {inventoryLots.map((il) => (
                                <option key={il.lot_id} value={il.lot_id}>
                                  {
                                    materials.find(
                                      (m) => m.material_id === il.material_id,
                                    )?.material_name
                                  }{" "}
                                  - {il.manufacturer_lot} ({il.quantity}{" "}
                                  {il.unit_of_measure})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                              Số lượng
                            </label>
                            <input
                              value={comp.planned_quantity}
                              type="number"
                              onChange={setComponent(idx, "planned_quantity")}
                              placeholder="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeComponent(idx)}
                              className="w-full px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-bold hover:bg-red-200"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {!isEditing ? (
            <>
              {isManager && (
                <button
                  type="button"
                  onClick={() => setShowStatusTransition(true)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 flex items-center gap-2"
                >
                  <ArrowRight size={14} /> Chuyển Trạng Thái
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                >
                  ✏️ Chỉnh sửa
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Đóng
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setForm({ ...batch });
                  setNewComponents([{ lot_id: "", planned_quantity: "" }]);
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Lưu..." : "✓ Lưu"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabLoThanhPham({
  materials,
  refresh,
}: {
  materials: Material[];
  refresh: number;
}) {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detailBatch, setDetailBatch] = useState<ProductionBatch | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchProductionBatches(1, 100);
      setBatches(result.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refresh]);

  const filtered = batches.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (search && !b.batch_number.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div>
      {detailBatch && (
        <ProductionBatchDetailModal
          batch={detailBatch}
          onClose={() => setDetailBatch(null)}
          onUpdated={load}
          isManager={true}
        />
      )}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Batch ID..."
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="On Hold">Chờ xử lý</option>
          <option value="In Progress">Đang xử lý</option>
          <option value="Complete">Hoàn thành</option>
          <option value="Cancelled">Hủy</option>
        </select>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        {loading && (
          <div className="p-8 text-center text-gray-400 text-sm">
            Đang tải...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-gray-300">
            <p className="text-sm">Chưa có batch nào</p>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-black text-gray-600">
                  Batch Number
                </th>
                <th className="px-4 py-2 text-left font-black text-gray-600">
                  Product
                </th>
                <th className="px-4 py-2 text-left font-black text-gray-600">
                  Size
                </th>
                <th className="px-4 py-2 text-left font-black text-gray-600">
                  Status
                </th>
                <th className="px-4 py-2 text-left font-black text-gray-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const mat = materials.find(
                  (m) => m.material_id === b.product_id,
                );
                const status = statusLabel(b.status);
                return (
                  <tr
                    key={b.batch_id}
                    className="border-t border-gray-200 hover:bg-gray-50"
                  >
                    <td
                      className="px-4 py-2 font-bold text-blue-600 cursor-pointer"
                      onClick={() => setDetailBatch(b)}
                    >
                      {b.batch_number}
                    </td>
                    <td className="px-4 py-2">
                      {mat?.material_name || b.product_id}
                    </td>
                    <td className="px-4 py-2">
                      {b.batch_size} {b.unit_of_measure}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-bold ${status.cls}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setDetailBatch(b)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TabBaoCao({
  materials,
  onCreated,
}: {
  materials: Material[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    batch_number: "",
    product_id: "",
    batch_size: "",
    unit_of_measure: "kg",
    shelf_life_value: "",
    shelf_life_unit: "day",
    status: "On Hold",
  });
  const [components, setComponents] = useState([
    { lot_id: "", planned_quantity: "" },
  ]);
  const [inventoryLots, setInventoryLots] = useState<InventoryLot[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const setComponent =
    (idx: number, key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const updated = [...components];
      updated[idx] = { ...updated[idx], [key]: e.target.value };
      setComponents(updated);
    };

  const addComponent = () => {
    setComponents((prev) => [...prev, { lot_id: "", planned_quantity: "" }]);
  };

  const removeComponent = (idx: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== idx));
  };

  // Load inventory lots on mount
  useEffect(() => {
    const load = async () => {
      try {
        const lots = await fetchInventoryLots();
        setInventoryLots(lots);
      } catch (e) {
        console.error("Error loading inventory lots:", e);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (
        !form.batch_number ||
        !form.product_id ||
        !form.batch_size ||
        !form.shelf_life_value
      ) {
        throw new Error("Vui lòng điền đầy đủ thông tin");
      }

      if (!components.some((comp) => comp.lot_id && comp.planned_quantity)) {
        throw new Error("Vui lòng thêm ít nhất 1 nguyên liệu");
      }

      // Create batch (batch_id auto-generated by backend via Redis)
      const result = await createProductionBatch({
        batch_number: form.batch_number,
        product_id: form.product_id,
        batch_size: Number(form.batch_size),
        unit_of_measure: form.unit_of_measure,
        shelf_life_value: Number(form.shelf_life_value),
        shelf_life_unit: form.shelf_life_unit,
        status: form.status,
      } as any);

      // Get batch_id from response
      const batchId = (result as any).batch_id || form.batch_number;

      // Add components
      for (const comp of components) {
        if (comp.lot_id && comp.planned_quantity) {
          try {
            await apiClient.post(`/production-batches/${batchId}/components`, {
              lot_id: comp.lot_id,
              planned_quantity: comp.planned_quantity,
            });
          } catch (compError: any) {
            throw compError;
          }
        }
      }

      setSuccess("Tạo batch thành công!");
      setForm({
        batch_number: "",
        product_id: "",
        batch_size: "",
        unit_of_measure: "kg",
        shelf_life_value: "",
        shelf_life_unit: "day",
        status: "On Hold",
      });
      setComponents([{ lot_id: "", planned_quantity: "" }]);
      setTimeout(() => {
        onCreated();
      }, 800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <FlaskConical size={24} className="text-white" />
          <div>
            <h2 className="text-lg font-black text-white">
              KHỞI TẠO PRODUCTION BATCH
            </h2>
            <p className="text-xs text-blue-100">
              Khai báo thành phẩm & sử dụng nguyên liệu
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-bold">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-bold">
              {success}
            </div>
          )}

          {/* Section 1: Thông tin batch */}
          <div>
            <h3 className="text-sm font-black text-gray-700 uppercase mb-4 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-600" />
              Thông tin lô sản xuất
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-600 uppercase mb-2">
                  Mã Lô Sản Xuất *
                </label>
                <input
                  value={form.batch_number}
                  onChange={set("batch_number")}
                  placeholder="VD: PB-2026-XXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 uppercase mb-2">
                  Sản Phẩm Hoàn Thành *
                </label>
                <select
                  value={form.product_id}
                  onChange={set("product_id")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {materials.map((m) => (
                    <option key={m.material_id} value={m.material_id}>
                      {m.material_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 uppercase mb-2">
                  Số Lượng Thu Được *
                </label>
                <div className="flex gap-2">
                  <input
                    value={form.batch_size}
                    onChange={set("batch_size")}
                    type="number"
                    placeholder="0.000"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={form.unit_of_measure}
                    onChange={set("unit_of_measure")}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="piece">piece</option>
                    <option value="liter">liter</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Shelf Life & Status */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-black text-gray-600 uppercase mb-2">
                  Thời Hạn *
                </label>
                <div className="flex gap-1">
                  <input
                    value={form.shelf_life_value}
                    onChange={set("shelf_life_value")}
                    type="number"
                    placeholder="0"
                    className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={form.shelf_life_unit}
                    onChange={set("shelf_life_unit")}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="day">Ngày</option>
                    <option value="month">Tháng</option>
                    <option value="year">Năm</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 uppercase mb-2">
                  Trạng Thái
                </label>
                <input
                  value={form.status}
                  type="text"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Nguyên liệu sử dụng */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-700 uppercase flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-blue-600" />
                Nguyên Liệu Sử Dụng (Bắt Buộc)
              </h3>
              <button
                type="button"
                onClick={addComponent}
                className="flex items-center gap-1 px-3 py-1 text-blue-600 font-bold text-xs hover:bg-blue-50 rounded"
              >
                <Plus size={14} />
                THÊM NGUYÊN LIỆU
              </button>
            </div>

            <div className="space-y-3">
              {components.map((comp, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {/* Lot dropdown */}
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                        Lô Hàng *
                      </label>
                      <select
                        value={comp.lot_id}
                        onChange={setComponent(idx, "lot_id")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="">-- Chọn lô hàng --</option>
                        {inventoryLots.map((il) => {
                          const mat = materials.find(
                            (m) => m.material_id === il.material_id,
                          );
                          return (
                            <option key={il.lot_id} value={il.lot_id}>
                              {mat?.material_name} - {il.manufacturer_lot} (
                              {il.quantity} {il.unit_of_measure})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Quantity input */}
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                        Số Lượng *
                      </label>
                      <input
                        value={comp.planned_quantity}
                        onChange={setComponent(idx, "planned_quantity")}
                        type="number"
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* Remove button */}
                    {components.length > 1 && (
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeComponent(idx)}
                          className="w-full p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving ? "⏳ Đang xử lý..." : "✓ Tạo Production Batch"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ProductCreation() {
  const [tab, setTab] = useState<"create" | "list">("list");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const mat = await fetchMaterials();
        setMaterials(mat);
      } catch (e) {
        console.error("Error loading materials:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Đang tải...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">
          Quản lý Production Batch
        </h1>
        <div className="flex items-center gap-1 text-xs font-bold text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          ONLINE
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setTab("list")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition ${
            tab === "list"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
          }`}
        >
          <Package size={14} />
          Danh Sách Batch
        </button>
        <button
          onClick={() => setTab("create")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition ${
            tab === "create"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
          }`}
        >
          <FlaskConical size={14} />
          Tạo Batch
        </button>
      </div>
      {tab === "create" ? (
        <TabBaoCao
          materials={materials}
          onCreated={() => setRefresh((r) => r + 1)}
        />
      ) : (
        <TabLoThanhPham materials={materials} refresh={refresh} />
      )}
    </div>
  );
}
