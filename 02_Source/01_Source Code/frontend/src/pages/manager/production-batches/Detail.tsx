import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Plus,
  FlaskConical,
  Package,
  RefreshCw,
  X,
} from "lucide-react";
import type {
  ProductionBatch,
  BatchComponent,
} from "../../../types/production";
import {
  fetchProductionBatch,
  fetchBatchComponents,
  deleteProductionBatch,
  createBatchComponent,
  deleteBatchComponent,
} from "../../../services/productionBatchService";
import { v4 as uuidv4 } from "uuid";

const STATUS_COLORS: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700",
  Complete: "bg-green-100 text-green-700",
  "On Hold": "bg-yellow-100 text-yellow-700",
  Cancelled: "bg-red-100 text-red-700",
};

function AddComponentModal({
  batchId,
  onClose,
  onSaved,
}: {
  batchId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    lot_id: "",
    planned_quantity: "",
    unit_of_measure: "",
    added_by: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await createBatchComponent(batchId, {
        lot_id: form.lot_id,
        planned_quantity: form.planned_quantity,
        unit_of_measure: form.unit_of_measure,
        added_by: form.added_by || undefined,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-gray-900">
            Thêm Batch Component
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        {err && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold">
            {err}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Lot ID *
            </label>
            <input
              required
              value={form.lot_id}
              onChange={(e) => setForm({ ...form, lot_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập Lot ID"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
                Planned Qty *
              </label>
              <input
                required
                type="number"
                min="0.001"
                step="any"
                value={form.planned_quantity}
                onChange={(e) =>
                  setForm({ ...form, planned_quantity: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
                Unit *
              </label>
              <input
                required
                maxLength={10}
                value={form.unit_of_measure}
                onChange={(e) =>
                  setForm({ ...form, unit_of_measure: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="kg, mg..."
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Added By
            </label>
            <input
              value={form.added_by}
              onChange={(e) => setForm({ ...form, added_by: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tên người thêm (không bắt buộc)"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Thêm Component"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductionBatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<ProductionBatch | null>(null);
  const [components, setComponents] = useState<BatchComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingCompId, setDeletingCompId] = useState<
    string | null | undefined
  >(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [b, comps] = await Promise.all([
        fetchProductionBatch(id),
        fetchBatchComponents(id),
      ]);
      setBatch(b);
      setComponents(comps);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteBatch = async () => {
    if (!batch) return;
    if (!window.confirm(`Xóa batch "${batch.batch_number}"?`)) return;
    try {
      await deleteProductionBatch(batch.batch_id);
      navigate("/manager/production-batches");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteComponent = async (comp: BatchComponent) => {
    if (!batch) return;
    if (!comp.component_id) return;
    if (!window.confirm(`Xóa component "${comp.component_id}"?`)) return;
    setDeletingCompId(comp.component_id);
    try {
      await deleteBatchComponent(batch.batch_id, comp.component_id);
      setComponents((prev) =>
        prev.filter((c) => c.component_id !== comp.component_id),
      );
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeletingCompId(null);
    }
  };

  if (loading)
    return (
      <div className="p-16 text-center text-gray-400 text-sm font-bold animate-pulse">
        Đang tải...
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center text-red-500 font-bold">{error}</div>
    );

  if (!batch) return null;

  return (
    <div className="space-y-6">
      {showAddModal && (
        <AddComponentModal
          batchId={batch.batch_id}
          onClose={() => setShowAddModal(false)}
          onSaved={load}
        />
      )}

      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/manager/production-batches")}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1 px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() =>
              navigate(`/manager/production-batches/${batch.batch_id}/edit`)
            }
            className="flex items-center gap-1 px-4 py-2 border border-yellow-200 bg-yellow-50 rounded-xl text-sm font-bold text-yellow-700 hover:bg-yellow-100"
          >
            <Edit2 size={15} /> Chỉnh sửa
          </button>
          <button
            onClick={handleDeleteBatch}
            className="flex items-center gap-1 px-4 py-2 border border-red-200 bg-red-50 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100"
          >
            <Trash2 size={15} /> Xóa Batch
          </button>
        </div>
      </div>

      {/* Batch Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <FlaskConical size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">
                {batch.batch_number}
              </h2>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                ID: {batch.batch_id}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black ${STATUS_COLORS[batch.status] ?? "bg-gray-100 text-gray-600"}`}
          >
            {batch.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Product ID", value: batch.product_id },
            {
              label: "Batch Size",
              value: `${batch.batch_size} ${batch.unit_of_measure}`,
            },
            { label: "Unit of Measure", value: batch.unit_of_measure },
            {
              label: "Manufacture Date",
              value: new Date(batch.manufacture_date).toLocaleDateString(
                "vi-VN",
              ),
            },
            {
              label: "Expiration Date",
              value: new Date(batch.expiration_date).toLocaleDateString(
                "vi-VN",
              ),
            },
            {
              label: "Created Date",
              value: new Date(batch.created_date).toLocaleDateString("vi-VN"),
            },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                {label}
              </div>
              <div className="text-sm font-bold text-gray-800">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Batch Components */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            <span className="font-black text-gray-700">
              Batch Components ({components.length})
            </span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Plus size={14} /> Thêm Component
          </button>
        </div>

        {components.length === 0 ? (
          <div className="p-12 text-center text-gray-300">
            <Package size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold">Chưa có component nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Component ID",
                    "Lot ID",
                    "Planned Qty",
                    "Actual Qty",
                    "Unit",
                    "Added By",
                    "Addition Date",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {components.map((comp) => (
                  <tr
                    key={comp.component_id ?? comp.lot_id}
                    className="border-t border-gray-50 hover:bg-blue-50/20 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-purple-700">
                        {comp.component_id
                          ? `${comp.component_id.substring(0, 8)}...`
                          : "—"}
                      </code>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">
                      {comp.lot_id}
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-800">
                      {comp.planned_quantity}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {comp.actual_quantity ?? (
                        <span className="text-gray-300 italic">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {comp.unit_of_measure}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {comp.added_by ?? (
                        <span className="text-gray-300 italic">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {comp.addition_date
                        ? new Date(comp.addition_date).toLocaleDateString(
                            "vi-VN",
                          )
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        disabled={deletingCompId === comp.component_id}
                        onClick={() => handleDeleteComponent(comp)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-gray-300 hover:text-red-500 transition-all disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
