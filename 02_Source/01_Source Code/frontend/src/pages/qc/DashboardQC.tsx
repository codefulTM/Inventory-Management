import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { FlaskConical, Package, ClipboardList, BarChart3 } from 'lucide-react';
import { getDashboardKPI, getInventoryLots } from '../../services/qcServices';
import type { DashboardKPI, InventoryLot } from '../../types/qc';

function getPriority(expirationDate?: string): 'High' | 'Normal' {
  if (!expirationDate) return 'Normal';
  const days = Math.ceil(
    (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return days < 7 ? 'High' : 'Normal';
}

export default function DashboardQC() {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [pendingLots, setPendingLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [kpiData, lotsData] = await Promise.all([
          getDashboardKPI(),
          getInventoryLots('Quarantine'),
        ]);
        setKpi(kpiData);
        console.log('Fetched KPI:', kpiData);
        setPendingLots(lotsData.slice(0, 5));
        console.log('Fetched pending lots:', lotsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, []);

  // Đảm bảo luôn có giá trị mặc định nếu backend thiếu trường nào
  const safeKPI = {
    pending_count: kpi?.pending_count ?? 0,
    approved_count: kpi?.approved_count ?? 0,
    rejected_count: kpi?.rejected_count ?? 0,
    error_rate: kpi?.error_rate ?? 0,
  };

  // Luôn render stats với safeKPI, không phụ thuộc vào kpi
  const stats = [
    { label: 'Lô chờ kiểm định', value: String(safeKPI.pending_count), color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    { label: 'Đạt chuẩn tháng này', value: String(safeKPI.approved_count), color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { label: 'Từ chối tháng này', value: String(safeKPI.rejected_count), color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { label: 'Tỷ lệ lỗi', value: `${safeKPI.error_rate.toFixed(1)}%`, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Tổng quan chất lượng</h1>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Tổng quan kiểm soát chất lượng</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading || !stats
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 bg-white border border-gray-200 rounded-xl animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            ))
          : stats.map((s) => (
              <div key={s.label} className={`p-5 ${s.bg} border ${s.border} rounded-xl`}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</p>
              </div>
            ))}
      </div>

      {/* Pending Lots Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Lô hàng chờ kiểm định</h2>
          <button
            onClick={() => void navigate('/qc/inbound')}
            className="text-sm text-green-600 hover:underline"
          >
            Xem tất cả →
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : pendingLots.length === 0 ? (
            <p className="p-6 text-center text-gray-400 text-sm">Không có lô hàng nào đang chờ kiểm định.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Mã lô</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Tên sản phẩm</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Nhà cung cấp</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Số lượng</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Ưu tiên</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingLots.map((lot) => {
                  const priority = getPriority(lot.expiration_date);
                  return (
                    <tr key={lot.lot_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-medium text-gray-800">{lot.lot_id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">{lot.material_name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-500">{lot.supplier_name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">{lot.quantity} {lot.unit_of_measure ?? ''}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {priority === 'High' ? 'Cao' : 'Bình thường'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => void navigate('/qc/inbound')}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Lấy mẫu ngay →
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
    </div>
  );
}
