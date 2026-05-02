/**
 * OperatorProductionBatchForm Page
 * Trang tạo mới hoặc chỉnh sửa Production Batch (Lô sản xuất) dành cho Operator
 * 
 * Chức năng chính:
 * - Tạo lô sản xuất mới (khi không có ID)
 * - Chỉnh sửa lô sản xuất hiện có (khi có ID trên URL)
 * - Nhập thông tin: mã lô, sản phẩm, kích thước lô, ngày SX, hạn dùng
 * - Chọn sản phẩm từ danh sách vật tư (chỉ tạo mới)
 * - Cập nhật trạng thái lô: In Progress, Complete, On Hold, Cancelled
 * 
 * Lưu ý:
 * - Khi tạo mới: Batch ID tự động sinh bởi hệ thống (BAT-n)
 * - Khi chỉnh sửa: Không thể thay đổi Batch ID và Product ID
 * - Sản phẩm (Product ID) phải là loại "Finished Product" hoặc "Intermediate"
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FlaskConical } from 'lucide-react';
import type { BatchStatus } from '../../../types/production';
import { BATCH_STATUS_LIST } from '../../../types/production';
import {
  fetchProductionBatch,
  createProductionBatch,
  updateProductionBatch,
} from '../../../services/productionBatchService';
import { fetchMaterials } from '../../../services/materialService';
import SelectMenu, { type SelectItem } from '../../../components/SelectMenu';

// Cấu hình form lô sản xuất
interface FormState {
  batch_id: string;  // Mã lô (tự động sinh khi tạo mới)
  product_id: string;  // Mã sản phẩm hoàn thành
  batch_number: string;  // Số lô (do người dùng nhập)
  unit_of_measure: string;  // Đơn vị tính
  manufacture_date: string;  // Ngày sản xuất
  expiration_date: string;  // Ngày hết hạn
  status: BatchStatus;  // Trạng thái lô
  batch_size: string;  // Kích thước lô (số lượng sản xuất)
}

// Giá trị mặc định cho form tạo mới
const EMPTY_FORM: FormState = {
  batch_id: '',
  product_id: '',
  batch_number: '',
  unit_of_measure: '',
  manufacture_date: '',
  expiration_date: '',
  status: 'In Progress',  // Mặc định là đang sản xuất
  batch_size: '',
};

export default function OperatorProductionBatchForm() {
  // Lấy ID từ URL (nếu có = chế độ chỉnh sửa)
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);  // true = chỉnh sửa, false = tạo mới

  // State quản lý form
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(isEdit);  // Loading khi tải dữ liệu chỉnh sửa
  const [saving, setSaving] = useState(false);  // Loading khi lưu
  const [error, setError] = useState<string | null>(null);

  // State cho dropdown chọn sản phẩm
  const [materialItems, setMaterialItems] = useState<SelectItem[]>([]);
  const [materialSearch, setMaterialSearch] = useState('');

  // Tải danh sách vật tư để hiển thị trong dropdown
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

  // Tải thông tin lô khi chỉnh sửa
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
          // Cắt chuỗi ngày thành format YYYY-MM-DD
          manufacture_date: b.manufacture_date ? b.manufacture_date.substring(0, 10) : '',
          expiration_date: b.expiration_date ? b.expiration_date.substring(0, 10) : '',
          status: b.status,
          batch_size: b.batch_size,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Hàm cập nhật form khi thay đổi input
  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  // Xử lý submit form (tạo mới hoặc cập nhật)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Chuyển batch_size từ string sang number
      const payload = { ...form, batch_size: parseFloat(form.batch_size) as any };
      if (isEdit && id) {
        // Chế độ chỉnh sửa: gọi API update
        await updateProductionBatch(id, payload);
      } else {
        // Chế độ tạo mới: gọi API create
        await createProductionBatch(payload);
      }
      // Chuyển về trang danh sách sau khi lưu thành công
      navigate('/operator/production-batches');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Hiển thị loading khi tải dữ liệu
  if (loading)
    return (
      <div className="p-16 text-center text-gray-400 text-sm font-bold animate-pulse">
        Đang tải...
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header với nút quay lại */}
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
            {isEdit ? 'Chỉnh Sửa Production Batch' : 'Tạo Production Batch Mới'}
          </h2>
        </div>
      </div>

      {/* Form nhập liệu */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
      >
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {/* Batch ID - Chỉ đọc khi chỉnh sửa, hiển thị thông báo tự động sinh khi tạo mới */}
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
            Mã Lô (Batch ID)
          </label>
          {isEdit ? (
            <input
              readOnly
              value={form.batch_id}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-400"
            />
          ) : (
            <div className="w-full px-4 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 italic">
              Tự động sinh bởi hệ thống (BAT-n)
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Batch Number - Số lô do người dùng đặt */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Số Lô (Batch Number) *
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

          {/* Product ID - Chọn sản phẩm từ danh sách */}
          <div>
            <label className='block text-xs font-black text-gray-500 uppercase tracking-wider mb-1'>
              Sản Phẩm (Product ID) *
            </label>
            {isEdit ? (
              // Chế độ chỉnh sửa: không cho thay đổi sản phẩm
              <input
                readOnly
                value={form.product_id}
                className='w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none bg-gray-50 text-gray-400'
              />
            ) : (
              // Chế độ tạo mới: cho phép chọn sản phẩm
              <SelectMenu
                items={materialItems}
                value={form.product_id}
                onChange={(v) => setForm((prev) => ({ ...prev, product_id: String(v) }))}
                placeholder='— Chọn Sản Phẩm —'
                showSearch
                searchValue={materialSearch}
                onSearchChange={setMaterialSearch}
                searchPlaceholder='Tìm sản phẩm...'
                selectClassName='w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
              />
            )}
          </div>

          {/* Batch Size - Kích thước lô */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Kích Thước Lô (Batch Size) *
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

          {/* Unit of Measure - Đơn vị tính */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Đơn Vị Tính (Unit of Measure) *
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

          {/* Manufacture Date - Ngày sản xuất */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Ngày Sản Xuất (Manufacture Date) *
            </label>
            <input
              required
              type="date"
              value={form.manufacture_date}
              onChange={set('manufacture_date')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Expiration Date - Ngày hết hạn */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Ngày Hết Hạn (Expiration Date) *
            </label>
            <input
              required
              type="date"
              value={form.expiration_date}
              onChange={set('expiration_date')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status - Trạng thái lô (full width) */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
              Trạng Thái (Status) *
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

        {/* Nút hành động: Hủy và Lưu */}
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
            {saving ? 'Đang Lưu...' : isEdit ? 'Cập Nhật' : 'Tạo Batch'}
          </button>
        </div>
      </form>
    </div>
  );
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

  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Product/Material options
  const [materialItems, setMaterialItems] = useState<SelectItem[]>([]);
  const [materialSearch, setMaterialSearch] = useState('');

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
            <label className='block text-xs font-black text-gray-500 uppercase tracking-wider mb-1'>
              Product ID *
            </label>
            {isEdit ? (
              <input
                readOnly
                value={form.product_id}
                className='w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none bg-gray-50 text-gray-400'
              />
            ) : (
              <SelectMenu
                items={materialItems}
                value={form.product_id}
                onChange={(v) => setForm((prev) => ({ ...prev, product_id: String(v) }))}
                placeholder='— Chọn sản phẩm —'
                showSearch
                searchValue={materialSearch}
                onSearchChange={setMaterialSearch}
                searchPlaceholder='Tìm product ID...'
                selectClassName='w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
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
