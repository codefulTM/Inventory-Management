import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getDashboardKPI, getInventoryLots } from '../../services/qcServices';
import type { DashboardKPI, InventoryLot } from '../../types/qc';
import { PageWrapper, StatsGrid, StatCard, LoadingSkeleton } from '../../components/ui';
import { Badge } from '../../components/ui';

function getPriority(expirationDate?: string): 'High' | 'Normal' {
  if (!expirationDate) return 'Normal';
  const days = Math.ceil(
    (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  return days < 7 ? 'High' : 'Normal';
}

const PENDING_LOT_PAGE_SIZE = 5;

export default function DashboardQC() {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [pendingLots, setPendingLots] = useState<InventoryLot[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
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
        setPendingLots(lotsData);
        setPendingPage(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, []);

  const safeKPI = {
    pending_count: kpi?.pending_count ?? 0,
    approved_count: kpi?.approved_count ?? 0,
    rejected_count: kpi?.rejected_count ?? 0,
    error_rate: kpi?.error_rate ?? 0,
  };

  const pendingTotalItems = pendingLots.length;
  const pendingTotalPages = Math.max(1, Math.ceil(pendingTotalItems / PENDING_LOT_PAGE_SIZE));
  const pendingStart = (pendingPage - 1) * PENDING_LOT_PAGE_SIZE;
  const paginatedPendingLots = pendingLots.slice(pendingStart, pendingStart + PENDING_LOT_PAGE_SIZE);
  const pendingDisplayFrom = pendingTotalItems === 0 ? 0 : pendingStart + 1;
  const pendingDisplayTo = Math.min(pendingPage * PENDING_LOT_PAGE_SIZE, pendingTotalItems);

  useEffect(() => {
    if (pendingPage > pendingTotalPages) {
      setPendingPage(pendingTotalPages);
    }
  }, [pendingPage, pendingTotalPages]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="p-6">
          <div className="mb-6">
            <LoadingSkeleton variant="text" className="w-48 h-8" />
            <LoadingSkeleton variant="text" className="w-56 h-4 mt-2" />
          </div>
          <StatsGrid cols={4}>
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
          </StatsGrid>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fadeInUp">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">
              Tổng quan chất lượng
            </h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">
              Tổng quan kiểm soát chất lượng
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm animate-fadeIn">
            ⚠️ {error}
          </div>
        )}

        {/* KPI Cards */}
        <StatsGrid cols={4}>
          <div className="stagger-item" style={{ animationDelay: '0ms' }}>
            <StatCard
              label="Lô chờ kiểm định"
              value={safeKPI.pending_count}
              icon={<Clock className="w-5 h-5" />}
              variant={safeKPI.pending_count > 0 ? 'warning' : 'default'}
            />
          </div>
          <div className="stagger-item" style={{ animationDelay: '50ms' }}>
            <StatCard
              label="Đạt chuẩn tháng này"
              value={safeKPI.approved_count}
              icon={<CheckCircle className="w-5 h-5" />}
              variant="success"
            />
          </div>
          <div className="stagger-item" style={{ animationDelay: '100ms' }}>
            <StatCard
              label="Từ chối tháng này"
              value={safeKPI.rejected_count}
              icon={<XCircle className="w-5 h-5" />}
              variant={safeKPI.rejected_count > 0 ? 'error' : 'default'}
            />
          </div>
          <div className="stagger-item" style={{ animationDelay: '150ms' }}>
            <StatCard
              label="Tỷ lệ lỗi"
              value={`${safeKPI.error_rate.toFixed(1)}%`}
              icon={<AlertTriangle className="w-5 h-5" />}
              variant={safeKPI.error_rate > 10 ? 'error' : safeKPI.error_rate > 5 ? 'warning' : 'success'}
            />
          </div>
        </StatsGrid>

        {/* Pending Lots Table */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Lô hàng chờ kiểm định</h2>
            <button
              onClick={() => void navigate('/qc/inbound')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
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
              <div>
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
                    {paginatedPendingLots.map((lot) => {
                      const priority = getPriority(lot.expiration_date);
                      return (
                        <tr key={lot.lot_id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 font-mono font-medium text-gray-800">
                            {lot.lot_id}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700">
                            {lot.material_name}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500">
                            {lot.supplier_name}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700">
                            {lot.quantity} {lot.unit_of_measure ?? ''}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={priority === 'High' ? 'error' : 'neutral'}>
                              {priority === 'High' ? 'Cao' : 'Bình thường'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => void navigate('/qc/inbound')}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
                            >
                              Lấy mẫu ngay →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Hiển thị {pendingDisplayFrom}-{pendingDisplayTo} / {pendingTotalItems} lô hàng
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPendingPage((prev) => Math.max(1, prev - 1))}
                      disabled={pendingPage === 1}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-200"
                    >
                      Trước
                    </button>
                    <span className="text-xs text-gray-500">
                      Trang {pendingPage}/{pendingTotalPages}
                    </span>
                    <button
                      onClick={() => setPendingPage((prev) => Math.min(pendingTotalPages, prev + 1))}
                      disabled={pendingPage === pendingTotalPages}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-200"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}