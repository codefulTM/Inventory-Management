/**
 * OperatorProductionBatchList Page
 * Trang danh sách Production Batches (Lô sản xuất) dành cho Operator
 * 
 * Chức năng chính:
 * - Hiển thị danh sách tất cả lô sản xuất trong hệ thống
 * - Lọc lô theo trạng thái: In Progress, Complete, On Hold, Cancelled
 * - Tìm kiếm và phân trang danh sách lô
 * - Xem chi tiết, chỉnh sửa hoặc xóa lô sản xuất
 * - Nút tạo lô mới chuyển hướng đến form tạo lô
 * 
 * Các trạng thái lô:
 * - In Progress: Đang sản xuất (không thể xóa)
 * - Complete: Hoàn thành sản xuất
 * - On Hold: Tạm dừng (cho phép chỉnh sửa)
 * - Cancelled: Đã hủy
 * 
 * Phân trang: Hiển thị 10 lô/trang
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Trash2,
  Eye,
  Edit2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
} from 'lucide-react';
import type { ProductionBatch, BatchStatus } from '../../../types/production';
import { BATCH_STATUS_LIST } from '../../../types/production';
import {
  fetchProductionBatches,
  fetchProductionBatchesByStatus,
  deleteProductionBatch,
} from '../../../services/productionBatchService';

// Màu sắc cho từng trạng thái lô
const STATUS_COLORS: Record<string, string> = {
  'In Progress': 'bg-blue-100 text-blue-700',  // Đang SX
  Complete: 'bg-green-100 text-green-700',  // Hoàn thành
  'On Hold': 'bg-yellow-100 text-yellow-700',  // Chờ xử lý
  Cancelled: 'bg-red-100 text-red-700',  // Đã hủy
};

export default function OperatorProductionBatchList() {
  const navigate = useNavigate();
  
  // State danh sách lô sản xuất
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [total, setTotal] = useState(0);  // Tổng số lô
  const [page, setPage] = useState(1);  // Trang hiện tại
  const [totalPages, setTotalPages] = useState(1);  // Tổng số trang
  const [statusFilter, setStatusFilter] = useState<BatchStatus | ''>('');  // Lọc theo trạng thái
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);  // ID đang xóa
  const LIMIT = 10;  // Số lô mỗi trang

  // Hàm tải danh sách lô
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Nếu có lọc trạng thái thì gọi API theo status, ngược lại lấy tất cả
      const result = statusFilter
        ? await fetchProductionBatchesByStatus(statusFilter, page, LIMIT)
        : await fetchProductionBatches(page, LIMIT);

      setBatches(result?.data || []);
      setTotal(result?.pagination?.total || 0);
      setTotalPages(result?.pagination?.totalPages || 1);
    } catch (e: any) {
      console.error('Failed to load production batches:', e);
      setError(e.message || 'Không thể tải danh sách lô sản xuất');
      setBatches([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  // Tải dữ liệu khi component mount hoặc filter/page thay đổi
  useEffect(() => {
    load();
  }, [load]);

  // Xử lý xóa lô sản xuất
  const handleDelete = async (batch: ProductionBatch) => {
    // Không cho xóa lô đang sản xuất
    if (batch.status === 'In Progress') {
      alert('Không thể xóa lô đang sản xuất (In Progress).');
      return;
    }
    if (
      !window.confirm(
        `Xóa lô "${batch.batch_number}"? Hành động này không thể hoàn tác.`,
      )
    )
      return;
    setDeletingId(batch.batch_id);
    try {
      await deleteProductionBatch(batch.batch_id);
      load();  // Reload danh sách
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Xử lý thay đổi bộ lọc trạng thái (reset về trang 1)
  const handleStatusFilter = (s: BatchStatus | '') => {
    setStatusFilter(s);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header: Tiêu đề và các nút hành động */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FlaskConical size={24} className="text-blue-600" />
            Danh Sách Lô Sản Xuất
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Lập kế hoạch & quản lý lô sản xuất — Operator
          </p>
        </div>
        <div className="flex gap-2">
          {/* Nút làm mới */}
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={16} />
            Làm Mới
          </button>
          {/* Nút tạo lô mới */}
          <button
            onClick={() => navigate('/operator/production-batches/create')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Plus size={16} />
            + Tạo Lô Mới
          </button>
        </div>
      </div>

      {/* Thanh lọc theo trạng thái */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleStatusFilter('')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            statusFilter === ''
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200'
          }`}
        >
          Tất Cả
        </button>
        {/* Các nút lọc theo trạng thái */}
        {BATCH_STATUS_LIST.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              statusFilter === s
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Bảng danh sách lô */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            Danh Sách Lô Sản Xuất
          </span>
          <span className="text-xs text-gray-400 font-bold">
            Tổng: {total} | Trang {page}/{totalPages}
          </span>
        </div>

        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold">
            {error}
          </div>
        )}

        {/* Hiển thị loading, danh sách trống hoặc bảng dữ liệu */}
        {loading ? (
          <div className="p-16 text-center text-gray-400 text-sm font-bold animate-pulse">
            Đang tải...
          </div>
        ) : batches.length === 0 ? (
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
                    'Mã Lô',
                    'Sản Phẩm',
                    'Kích Thước',
                    'Trạng Thái',
                    'Ngày SX',
                    'Hạn Dùng',
                    'Hành Động',
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
                    <td className="px-5 py-4 text-gray-600 font-mono text-xs">
                      {batch.product_id}
                    </td>
                    <td className="px-5 py-4 text-gray-700 font-bold">
                      {batch.batch_size}{' '}
                      <span className="text-gray-400 font-normal text-xs">
                        {batch.unit_of_measure}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          STATUS_COLORS[batch.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {batch.manufacture_date
                        ? new Date(batch.manufacture_date).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {batch.expiration_date
                        ? new Date(batch.expiration_date).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {/* Nút xem chi tiết */}
                        <button
                          title="Xem chi tiết"
                          onClick={() =>
                            navigate(`/operator/production-batches/${batch.batch_id}`)
                          }
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        {/* Nút chỉnh sửa */}
                        <button
                          title="Chỉnh sửa"
                          onClick={() =>
                            navigate(
                              `/operator/production-batches/${batch.batch_id}/edit`,
                            )
                          }
                          className="p-1.5 hover:bg-yellow-50 text-yellow-600 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        {/* Nút xóa */}
                        <button
                          title="Xóa"
                          disabled={deletingId === batch.batch_id}
                          onClick={() => handleDelete(batch)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors disabled:opacity-40"
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

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={15} /> Trước
            </button>
            <span className="text-sm font-bold text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              Sau <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (batch: ProductionBatch) => {
    if (batch.status === 'In Progress') {
      alert('Không thể xóa batch đang sản xuất (In Progress).');
      return;
    }
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

  const handleStatusFilter = (s: BatchStatus | '') => {
    setStatusFilter(s);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FlaskConical size={24} className="text-blue-600" />
            Production Batches
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Lập kế hoạch &amp; quản lý lô sản xuất — Operator
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
          <button
            onClick={() => navigate('/operator/production-batches/create')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Plus size={16} />
            + New Batch
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleStatusFilter('')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            statusFilter === ''
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200'
          }`}
        >
          Tất cả
        </button>
        {BATCH_STATUS_LIST.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              statusFilter === s
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            Danh sách lô sản xuất
          </span>
          <span className="text-xs text-gray-400 font-bold">
            Tổng: {total} | Trang {page}/{totalPages}
          </span>
        </div>

        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-gray-400 text-sm font-bold animate-pulse">
            Đang tải...
          </div>
        ) : batches.length === 0 ? (
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
                    'Batch Number',
                    'Product ID',
                    'Batch Size',
                    'Status',
                    'Manufacture Date',
                    'Expiration Date',
                    'Actions',
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
                    <td className="px-5 py-4 text-gray-600 font-mono text-xs">
                      {batch.product_id}
                    </td>
                    <td className="px-5 py-4 text-gray-700 font-bold">
                      {batch.batch_size}{' '}
                      <span className="text-gray-400 font-normal text-xs">
                        {batch.unit_of_measure}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          STATUS_COLORS[batch.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {batch.manufacture_date
                        ? new Date(batch.manufacture_date).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {batch.expiration_date
                        ? new Date(batch.expiration_date).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          title="Xem chi tiết"
                          onClick={() =>
                            navigate(`/operator/production-batches/${batch.batch_id}`)
                          }
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          title="Chỉnh sửa"
                          onClick={() =>
                            navigate(
                              `/operator/production-batches/${batch.batch_id}/edit`,
                            )
                          }
                          className="p-1.5 hover:bg-yellow-50 text-yellow-600 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          title="Xóa"
                          disabled={deletingId === batch.batch_id}
                          onClick={() => handleDelete(batch)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors disabled:opacity-40"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={15} /> Trước
            </button>
            <span className="text-sm font-bold text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              Sau <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
