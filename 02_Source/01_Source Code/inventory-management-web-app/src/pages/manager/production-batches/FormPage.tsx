import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, FlaskConical } from "lucide-react";
import type { BatchStatus } from "../../../types/production";
import { BATCH_STATUS_LIST } from "../../../types/production";
import {
  fetchProductionBatch,
  createProductionBatch,
  updateProductionBatch,
} from "../../../services/productionBatchService";
import { fetchMaterials } from "../../../services/materialService";
import SelectMenu, { type SelectItem } from "../../../components/SelectMenu";

interface FormState {
  batch_id: string;
  product_id: string;
  batch_number: string;
  unit_of_measure: string;
  // manufacture_date: string;
  // expiration_date: string;
  status: BatchStatus;
  batch_size: string;
  shelf_life_value: string | number;
  shelf_life_unit: string;
}

const EMPTY_FORM: FormState = {
  batch_id: "",
  product_id: "",
  batch_number: "",
  unit_of_measure: "",
  // manufacture_date: "",
  // expiration_date: "",
  status: "On Hold",
  batch_size: "",
  shelf_life_value: "",
  shelf_life_unit: "month",
};

// Giả định có hook hoặc context xác định role
import { useAuth } from "../../../hooks/useAuth";

export default function ProductionBatchForm() {
  const { isManager } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Product/Material options
  const [materialItems, setMaterialItems] = useState<SelectItem[]>([]);
  const [materialSearch, setMaterialSearch] = useState("");

  useEffect(() => {
    fetchMaterials()
      .then((list) => {
        setMaterialItems(
          list.map((m) => ({
            id: m.material_id,
            label: `${m.material_id} — ${m.material_name} (${m.material_type})`,
          })),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    fetchProductionBatch(id)
      .then((b) => {
        setForm({
          batch_id: b.batch_id,
          product_id: b.product_id,
          batch_number: b.batch_number,
          unit_of_measure: b.unit_of_measure,
          // manufacture_date: b.manufacture_date
          //   ? b.manufacture_date.substring(0, 10)
          //   : '',
          // expiration_date: b.expiration_date
          //   ? b.expiration_date.substring(0, 10)
          //   : '',
          status: b.status,
          batch_size: b.batch_size.toString(),
          shelf_life_value: b.shelf_life_value || "",
          shelf_life_unit: b.shelf_life_unit || "month",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  // Tính expiration_date từ manufacture_date + shelf_life
  // useEffect(() => {
  //   if (!form.manufacture_date || !form.shelf_life_value) return;
  //   let date = new Date(form.manufacture_date);
  //   const value = Number(form.shelf_life_value);
  //   if (isNaN(value) || value <= 0) return;
  //   if (form.shelf_life_unit === "month") {
  //     date.setMonth(date.getMonth() + value);
  //   } else if (form.shelf_life_unit === "year") {
  //     date.setFullYear(date.getFullYear() + value);
  //   } else if (form.shelf_life_unit === "day") {
  //     date.setDate(date.getDate() + value);
  //   }
  //   setForm((prev) => ({
  //     ...prev,
  //     expiration_date: date.toISOString().slice(0, 10),
  //   }));
  // }, [form.manufacture_date, form.shelf_life_value, form.shelf_life_unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        batch_size: form.batch_size, // Keep as string to match backend DTO
        shelf_life_value: Number(form.shelf_life_value),
        shelf_life_unit: form.shelf_life_unit,
      };
      if (isEdit && id) {
        await updateProductionBatch(id, payload);
      } else {
        payload.status = "On Hold"; // Khi tạo mới luôn là On Hold
        await createProductionBatch(payload);
      }
      navigate("/manager/production-batches");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-16 text-center text-gray-400 text-sm font-bold animate-pulse">
        Đang tải...
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/manager/production-batches")}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <FlaskConical size={22} className="text-blue-600" />
          <h2 className="text-xl font-black text-gray-900">
            {isEdit ? "Chỉnh sửa Production Batch" : "Tạo Production Batch mới"}
          </h2>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
      >
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {/* Batch ID (readonly on edit, auto-generated on create) */}
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
            Batch ID
          </label>
          {isEdit ? (
            <input
              readOnly
              value={form.batch_id}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-400"
            />
          ) : (
            <div className="w-full px-4 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 italic">
              Tự động sinh bởi hệ thống (BAT-xxx)
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Shelf Life */}
          <div className="col-span-2">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Thời hạn sử dụng (Shelf Life) *
            </label>
            <div className="flex gap-2">
              <input
                required
                type="number"
                min="1"
                value={form.shelf_life_value}
                onChange={set("shelf_life_value")}
                className="w-32 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="12"
              />
              <select
                value={form.shelf_life_unit}
                onChange={set("shelf_life_unit")}
                className="w-28 px-2 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="day">Ngày</option>
                <option value="month">Tháng</option>
                <option value="year">Năm</option>
              </select>
            </div>
          </div>
          {/* Batch Number */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Batch Number *
            </label>
            <input
              required
              maxLength={50}
              value={form.batch_number}
              onChange={set("batch_number")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="BATCH-2026-001"
            />
          </div>

          {/* Product ID */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Product ID *
            </label>
            {isEdit ? (
              <input
                readOnly
                value={form.product_id}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none bg-gray-50 text-gray-400"
              />
            ) : (
              <SelectMenu
                items={materialItems}
                value={form.product_id}
                onChange={(v) => setForm((prev) => ({ ...prev, product_id: String(v) }))}
                placeholder="— Chọn sản phẩm —"
                showSearch
                searchValue={materialSearch}
                onSearchChange={setMaterialSearch}
                searchPlaceholder="Tìm product ID..."
                selectClassName="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            )}
          </div>

          {/* Batch Size */}
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
              onChange={set("batch_size")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1000"
            />
          </div>

          {/* Unit of Measure */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Unit of Measure *
            </label>
            <input
              required
              maxLength={10}
              value={form.unit_of_measure}
              onChange={set("unit_of_measure")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="kg, mg, L..."
            />
          </div>

          {/* Manufacture Date */}
          {/* <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Manufacture Date *
            </label>
            <input
              required
              type="date"
              value={form.manufacture_date}
              onChange={set("manufacture_date")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div> */}

          {/* Expiration Date */}
          {/* <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Expiration Date *
            </label>
            <input
              required
              type="date"
              value={form.expiration_date}
              onChange={set("expiration_date")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div> */}

          {/* Status */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Status *
            </label>
            <select
              required
              value={form.status}
              onChange={set("status")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={!isEdit || !isManager}
            >
              {BATCH_STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {!isManager && (
              <div className="text-xs text-gray-400 mt-1">
                Chỉ manager mới được đổi trạng thái
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate("/manager/production-batches")}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-blue-200"
          >
            <Save size={16} />
            {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo Batch"}
          </button>
        </div>
      </form>
    </div>
  );
}
