import { useState, useEffect, useCallback } from "react";

import {
  FlaskConical,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  X,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  ProductionBatch,
  BatchComponent,
  BatchStatus,
} from "../../types/production";
import { BATCH_STATUS_LIST } from "../../types/production";
import {
  fetchProductionBatches,
  fetchProductionBatchesByStatus,
  createProductionBatch,
  updateProductionBatch,
  deleteProductionBatch,
  fetchBatchComponents,
  createBatchComponent,
  deleteBatchComponent,
} from "../../services/productionBatchService";

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700",
  Complete: "bg-green-100 text-green-700",
  "On Hold": "bg-yellow-100 text-yellow-700",
  Cancelled: "bg-red-100 text-red-700",
};

function fmt(d?: string) {
  if (!d) return "—";
  return d.substring(0, 10);
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface BatchFormState {
  batch_id: string;
  product_id: string;
  batch_number: string;
  unit_of_measure: string;
  manufacture_date: string;
  expiration_date: string;
  status: BatchStatus;
  batch_size: string;
}

const EMPTY_BATCH: BatchFormState = {
  batch_id: "",
  product_id: "",
  batch_number: "",
  unit_of_measure: "",
  manufacture_date: "",
  expiration_date: "",
  status: "In Progress",
  batch_size: "",
};

// ── LoadingAndError ────────────────────────────────────────────────────────────

function LoadingAndError({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (!isLoading && !error) return null;
  return (
    <div>
      {isLoading && (
        <div className="p-16 text-center text-gray-400 text-sm font-bold animate-pulse">
          Đang tải dữ liệu...
        </div>
      )}
      {error && !isLoading && (
        <div className="flex flex-col items-center gap-3 p-12">
          <p className="text-red-500 font-bold text-sm">{error}</p>
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold"
          >
            <RefreshCw size={14} />
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}

// ── SearchAndFilters ───────────────────────────────────────────────────────────

function SearchAndFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onAdd,
  onRefresh,
}: {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  statusFilter: BatchStatus | "";
  onStatusChange: (v: BatchStatus | "") => void;
  onAdd: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FlaskConical size={24} className="text-blue-600" />
            Production Batches
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Quản lý lô sản xuất và thành phần nguyên liệu
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Plus size={16} />
            New Batch
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Tìm theo Batch Number hoặc Product ID..."
        className="w-full sm:w-80 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onStatusChange("")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            statusFilter === ""
              ? "bg-blue-600 text-white shadow-md shadow-blue-200"
              : "bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200"
          }`}
        >
          Tất cả
        </button>
        {BATCH_STATUS_LIST.map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              statusFilter === s
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── BatchTable ─────────────────────────────────────────────────────────────────

function BatchTable({
  batches,
  total,
  page,
  totalPages,
  onViewDetail,
  onEdit,
  onDelete,
  deletingId,
}: {
  batches: ProductionBatch[];
  total: number;
  page: number;
  totalPages: number;
  onViewDetail: (b: ProductionBatch) => void;
  onEdit: (b: ProductionBatch) => void;
  onDelete: (b: ProductionBatch) => void;
  deletingId: string | null;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          Danh sách lô sản xuất
        </span>
        <span className="text-xs text-gray-400 font-bold">
          Tổng: {total} | Trang {page}/{totalPages}
        </span>
      </div>

      {batches.length === 0 ? (
        <div className="p-16 text-center text-gray-300">
          <FlaskConical size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">Không có lô sản xuất nào</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Batch Number",
                  "Product ID",
                  "Batch Size",
                  "Unit",
                  "Status",
                  // "Manufacture Date",
                  // "Expiration Date",
                  "Actions",
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
              {batches.map((batch) => (
                <tr
                  key={batch.batch_id}
                  className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors"
                >
                  <td className="px-5 py-4 font-bold text-gray-900">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-blue-700">
                      {batch.batch_number}
                    </code>
                  </td>
                  <td className="px-5 py-4 text-gray-600 font-semibold">
                    {batch.product_id}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {batch.batch_size}
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {batch.unit_of_measure}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                        STATUS_COLORS[batch.status] ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {batch.status}
                    </span>
                  </td>
                  {/* <td className="px-5 py-4 text-gray-500">
                    {fmt(batch.manufacture_date)}
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {fmt(batch.expiration_date)}
                  </td> */}
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onViewDetail(batch)}
                        className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500 transition-all"
                        title="Xem chi tiết"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => onEdit(batch)}
                        className="p-1.5 hover:bg-yellow-100 rounded-lg text-yellow-500 transition-all"
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(batch)}
                        disabled={deletingId === batch.batch_id}
                        className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 transition-all disabled:opacity-40"
                        title="Xóa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── BatchFormFields (shared between Add / Edit) ────────────────────────────────

function BatchFormFields({
  form,
  onChange,
  isEdit,
}: {
  form: BatchFormState;
  onChange: (k: keyof BatchFormState, v: string) => void;
  isEdit: boolean;
}) {
  const field =
    (k: keyof BatchFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange(k, e.target.value);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
          Batch ID
        </label>
        {isEdit ? (
          <input
            readOnly
            value={form.batch_id}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        ) : (
          <div className="w-full px-4 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 italic">
            Tự động sinh bởi hệ thống (BAT-xxx)
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
            Batch Number *
          </label>
          <input
            required
            maxLength={50}
            value={form.batch_number}
            onChange={field("batch_number")}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="BATCH-2026-001"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
            Product ID *
          </label>
          <input
            required
            maxLength={20}
            value={form.product_id}
            onChange={field("product_id")}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="PROD-001"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
            Batch Size *
          </label>
          <input
            required
            type="number"
            min="0.001"
            step="any"
            value={form.batch_size}
            onChange={field("batch_size")}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1000"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
            Unit of Measure *
          </label>
          <input
            required
            maxLength={10}
            value={form.unit_of_measure}
            onChange={field("unit_of_measure")}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="kg, L..."
          />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
            Manufacture Date *
          </label>
          <input
            required
            type="date"
            value={form.manufacture_date}
            onChange={field("manufacture_date")}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
            Expiration Date *
          </label>
          <input
            required
            type="date"
            value={form.expiration_date}
            onChange={field("expiration_date")}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
          Status
        </label>
        <select
          value={form.status}
          onChange={field("status")}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {BATCH_STATUS_LIST.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── AddModal ───────────────────────────────────────────────────────────────────

function AddModal({
  isOpen,
  onClose,
  onSubmit,
  submitError,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: BatchFormState) => Promise<void>;
  submitError: string | null;
}) {
  const [form, setForm] = useState<BatchFormState>({ ...EMPTY_BATCH });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setForm({ ...EMPTY_BATCH });
  }, [isOpen]);

  const handleChange = (k: keyof BatchFormState, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit(form);
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <FlaskConical size={20} className="text-blue-600" />
            Tạo Production Batch mới
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-700">
              {submitError}
            </div>
          )}
          <BatchFormFields form={form} onChange={handleChange} isEdit={false} />
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
              {saving ? "Đang lưu..." : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── EditModal ──────────────────────────────────────────────────────────────────

function EditModal({
  isOpen,
  selectedBatch,
  onClose,
  onSubmit,
  submitError,
}: {
  isOpen: boolean;
  selectedBatch: ProductionBatch | null;
  onClose: () => void;
  onSubmit: (form: BatchFormState) => Promise<void>;
  submitError: string | null;
}) {
  const [form, setForm] = useState<BatchFormState>(EMPTY_BATCH);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedBatch && isOpen) {
      setForm({
        batch_id: selectedBatch.batch_id,
        product_id: selectedBatch.product_id,
        batch_number: selectedBatch.batch_number,
        unit_of_measure: selectedBatch.unit_of_measure,
        manufacture_date:
          selectedBatch.manufacture_date?.substring(0, 10) ?? "",
        expiration_date: selectedBatch.expiration_date?.substring(0, 10) ?? "",
        status: selectedBatch.status,
        batch_size: selectedBatch.batch_size,
      });
    }
  }, [selectedBatch, isOpen]);

  const handleChange = (k: keyof BatchFormState, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit(form);
    setSaving(false);
  };

  if (!isOpen || !selectedBatch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Edit2 size={20} className="text-yellow-500" />
            Chỉnh sửa Batch
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-700">
              {submitError}
            </div>
          )}
          <BatchFormFields form={form} onChange={handleChange} isEdit={true} />
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
              className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-bold hover:bg-yellow-600 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── AddComponentInline (inside DetailModal) ────────────────────────────────────

function AddComponentInline({
  batchId,
  onSaved,
}: {
  batchId: string;
  onSaved: () => void;
}) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    lot_id: "",
    planned_quantity: "",
    unit_of_measure: "",
    added_by: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
      >
        <Plus size={14} />
        Thêm Component
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await createBatchComponent(batchId, {
        component_id: "",
        batch_id: batchId,
        lot_id: form.lot_id,
        planned_quantity: form.planned_quantity,
        unit_of_measure: form.unit_of_measure,
        added_by: form.added_by || undefined,
      });
      setForm({
        lot_id: "",
        planned_quantity: "",
        unit_of_measure: "",
        added_by: "",
      });
      setShow(false);
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-4 border border-blue-200 bg-blue-50/40 rounded-xl space-y-3"
    >
      {err && <p className="text-xs text-red-600 font-bold">{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
            Lot ID *
          </label>
          <input
            required
            value={form.lot_id}
            onChange={(e) => setForm({ ...form, lot_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="LOT-..."
          />
        </div>
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
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="kg"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
            Added By
          </label>
          <input
            value={form.added_by}
            onChange={(e) => setForm({ ...form, added_by: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setShow(false)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );
}

// ── DetailModal ────────────────────────────────────────────────────────────────

function DetailModal({
  isOpen,
  selectedBatch,
  onClose,
  onEdit,
}: {
  isOpen: boolean;
  selectedBatch: ProductionBatch | null;
  onClose: () => void;
  onEdit: (b: ProductionBatch) => void;
}) {
  const [components, setComponents] = useState<BatchComponent[]>([]);
  const [loadingComp, setLoadingComp] = useState(false);
  const [deletingCompId, setDeletingCompId] = useState<string | null>(null);

  const loadComponents = useCallback(async () => {
    if (!selectedBatch) return;
    setLoadingComp(true);
    try {
      const comps = await fetchBatchComponents(selectedBatch.batch_id);
      setComponents(comps);
    } catch {
      // ignore
    } finally {
      setLoadingComp(false);
    }
  }, [selectedBatch]);

  useEffect(() => {
    if (isOpen && selectedBatch) loadComponents();
  }, [isOpen, selectedBatch, loadComponents]);

  const handleDeleteComponent = async (comp: BatchComponent) => {
    if (!selectedBatch) return;
    if (!window.confirm(`Xóa component này?`)) return;
    setDeletingCompId(comp.component_id || null);
    try {
      await deleteBatchComponent(selectedBatch.batch_id, comp.component_id || "");
      await loadComponents();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeletingCompId(null);
    }
  };

  if (!isOpen || !selectedBatch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <FlaskConical size={20} className="text-blue-600" />
            Chi tiết Batch
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(selectedBatch);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-600 rounded-xl text-sm font-bold hover:bg-yellow-100"
            >
              <Edit2 size={14} />
              Sửa
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Batch info grid */}
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                [
                  "Batch Number",
                  <code
                    key="bn"
                    className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-sm"
                  >
                    {selectedBatch.batch_number}
                  </code>,
                ],
                [
                  "Batch ID",
                  <span key="bid" className="text-gray-500 text-xs font-mono">
                    {selectedBatch.batch_id}
                  </span>,
                ],
                ["Product ID", selectedBatch.product_id],
                [
                  "Batch Size",
                  `${selectedBatch.batch_size} ${selectedBatch.unit_of_measure}`,
                ],
                [
                  "Status",
                  <span
                    key="st"
                    className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                      STATUS_COLORS[selectedBatch.status] ??
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedBatch.status}
                  </span>,
                ],
                ["Manufacture Date", fmt(selectedBatch.manufacture_date)],
                ["Expiration Date", fmt(selectedBatch.expiration_date)],
                ["Created", fmt(selectedBatch.created_date)],
              ] as [string, React.ReactNode][]
            ).map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-0.5">
                  {label}
                </p>
                <div className="text-sm font-semibold text-gray-800">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Components */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-black text-gray-700 flex items-center gap-1.5">
                <Package size={16} className="text-blue-500" />
                Batch Components
                <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
                  {components.length}
                </span>
              </h4>
              <button
                onClick={loadComponents}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
                title="Làm mới"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingComp ? (
              <p className="text-xs text-gray-400 animate-pulse py-3">
                Đang tải components...
              </p>
            ) : components.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">
                Chưa có component nào
              </p>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "Lot ID",
                        "Planned Qty",
                        "Actual Qty",
                        "Unit",
                        "Added By",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left font-black text-gray-400 uppercase tracking-widest"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((comp) => (
                      <tr
                        key={comp.component_id}
                        className="border-t border-gray-50 hover:bg-gray-50"
                      >
                        <td className="px-4 py-2.5 font-mono text-blue-600">
                          {comp.lot_id}
                        </td>
                        <td className="px-4 py-2.5">{comp.planned_quantity}</td>
                        <td className="px-4 py-2.5 text-gray-400">
                          {comp.actual_quantity ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">{comp.unit_of_measure}</td>
                        <td className="px-4 py-2.5 text-gray-400">
                          {comp.added_by ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => handleDeleteComponent(comp)}
                            disabled={deletingCompId === comp.component_id}
                            className="p-1 hover:bg-red-100 rounded text-red-400 disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <AddComponentInline
              batchId={selectedBatch.batch_id}
              onSaved={loadComponents}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="p-2 border border-gray-200 bg-white rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-bold text-gray-500">
        {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="p-2 border border-gray-200 bg-white rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const LIMIT = 10;

export default function ProductionBatches() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "">("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(
    null,
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = statusFilter
        ? await fetchProductionBatchesByStatus(statusFilter, page, LIMIT)
        : await fetchProductionBatches(page, LIMIT);
      console.log("[DEBUG] ProductionBatch API result:", result);
      // Đảm bảo batch nào cũng có batch_id (fallback sang _id)
      const mapped = (result.data || []).map((b) => ({
        ...b,
        batch_id: b.batch_id || b._id,
      }));
      setBatches(mapped);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages || 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredBatches = batches.filter(
    (b) =>
      b.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.product_id?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleViewDetail = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setShowDetailModal(true);
  };

  const handleEditClick = (batch: ProductionBatch) => {
    setSubmitError(null);
    setSelectedBatch(batch);
    setShowEditModal(true);
  };

  const handleAddClick = () => {
    setSubmitError(null);
    setShowAddModal(true);
  };

  const handleDelete = async (batch: ProductionBatch) => {
    if (
      !window.confirm(
        `Xóa batch "${batch.batch_number}"? Hành động này không thể hoàn tác.`,
      )
    )
      return;
    setDeletingId(batch.batch_id);
    try {
      await deleteProductionBatch(batch.batch_id);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddSubmit = async (form: BatchFormState) => {
    setSubmitError(null);
    try {
      await createProductionBatch({
        ...form,
        batch_size: parseFloat(form.batch_size) as any,
      });
      setShowAddModal(false);
      load();
    } catch (e: any) {
      setSubmitError(e.message);
    }
  };

  const handleEditSubmit = async (form: BatchFormState) => {
    setSubmitError(null);
    try {
      await updateProductionBatch(form.batch_id, {
        ...form,
        batch_size: parseFloat(form.batch_size) as any,
      });
      setShowEditModal(false);
      load();
    } catch (e: any) {
      setSubmitError(e.message);
    }
  };

  const handleStatusChange = (s: BatchStatus | "") => {
    setStatusFilter(s);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <LoadingAndError isLoading={loading} error={error} onRetry={load} />

      {!loading && (
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          onAdd={handleAddClick}
          onRefresh={load}
        />
      )}

      <BatchTable
        batches={filteredBatches}
        total={total}
        page={page}
        totalPages={totalPages}
        onViewDetail={handleViewDetail}
        onEdit={handleEditClick}
        onDelete={handleDelete}
        deletingId={deletingId}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <DetailModal
        isOpen={showDetailModal}
        selectedBatch={selectedBatch}
        onClose={() => setShowDetailModal(false)}
        onEdit={(b) => {
          setShowDetailModal(false);
          handleEditClick(b);
        }}
      />

      <AddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSubmit}
        submitError={submitError}
      />

      <EditModal
        isOpen={showEditModal}
        selectedBatch={selectedBatch}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSubmit}
        submitError={submitError}
      />
    </div>
  );
}
