import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FlaskConical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { BatchStatus } from '../../../types/production';
import { BATCH_STATUS_LIST } from '../../../types/production';
import {
  fetchProductionBatch,
  createProductionBatch,
  updateProductionBatch,
} from '../../../services/productionBatchService';

interface FormState {
  batch_id: string;
  product_id: string;
  batch_number: string;
  unit_of_measure: string;
  manufacture_date: string;
  expiration_date: string;
  status: BatchStatus;
  batch_size: string;
}

const EMPTY_FORM: FormState = {
  batch_id: '',
  product_id: '',
  batch_number: '',
  unit_of_measure: '',
  manufacture_date: '',
  expiration_date: '',
  status: 'In Progress',
  batch_size: '',
};

export default function OperatorProductionBatchForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, batch_id: uuidv4() });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          manufacture_date: b.manufacture_date ? b.manufacture_date.substring(0, 10) : '',
          expiration_date: b.expiration_date ? b.expiration_date.substring(0, 10) : '',
          status: b.status,
          batch_size: b.batch_size,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = { ...form, batch_size: parseFloat(form.batch_size) as any };
      if (isEdit && id) {
        await updateProductionBatch(id, payload);
      } else {
        await createProductionBatch(payload);
      }
      navigate('/operator/production-batches');
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
          onClick={() => navigate('/operator/production-batches')}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <FlaskConical size={22} className="text-blue-600" />
          <h2 className="text-xl font-black text-gray-900">
            {isEdit ? 'Chỉnh sửa Production Batch' : 'Tạo Production Batch mới'}
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

        {/* Batch ID (readonly on edit) */}
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
            Batch ID
          </label>
          <input
            readOnly={isEdit}
            value={form.batch_id}
            onChange={set('batch_id')}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 read-only:bg-gray-50 read-only:text-gray-400"
          />
          <p className="text-[10px] text-gray-400 mt-1">UUID tự động sinh, không cần chỉnh sửa</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Batch Number */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Batch Number *
            </label>
            <input
              required
              maxLength={50}
              value={form.batch_number}
              onChange={set('batch_number')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="BATCH-2026-001"
            />
          </div>

          {/* Product ID */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Product ID *
            </label>
            <input
              required
              maxLength={20}
              value={form.product_id}
              onChange={set('product_id')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="PROD-VC-500"
            />
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
              onChange={set('batch_size')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="100000"
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
              onChange={set('unit_of_measure')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="viên, kg, L..."
            />
          </div>

          {/* Manufacture Date */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Manufacture Date *
            </label>
            <input
              required
              type="date"
              value={form.manufacture_date}
              onChange={set('manufacture_date')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Expiration Date *
            </label>
            <input
              required
              type="date"
              value={form.expiration_date}
              onChange={set('expiration_date')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Status *
            </label>
            <select
              value={form.status}
              onChange={set('status')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {BATCH_STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/operator/production-batches')}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200"
          >
            <Save size={16} />
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo Batch'}
          </button>
        </div>
      </form>
    </div>
  );
}
