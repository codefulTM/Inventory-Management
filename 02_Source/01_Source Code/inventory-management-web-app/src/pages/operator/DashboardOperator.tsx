/**
 * DashboardOperator - Trang tổng quan dành cho Operator
 * 
 * Chức năng chính:
 * - Hiển thị các chỉ số KPI quan trọng: tổng số lô, lô quarantine, tổng giao dịch, lô cạn kiệt
 * - Bảng danh sách 10 lô hàng gần nhất với thông tin: mã lô, vật tư, số lượng, trạng thái
 * - Dữ liệu được lấy từ báo cáo tồn kho (inventory status report) và lịch sử giao dịch
 * 
 * Các trạng thái lô hàng:
 * - Quarantine: Lô hàng đang cách ly, chờ QC kiểm tra
 * - Accepted: Lô hàng đã được chấp nhận, sẵn sàng sử dụng
 * - Rejected: Lô hàng bị từ chối, không được sử dụng
 * - Depleted: Lô hàng đã cạn kiệt, cần nhập thêm
 * - In Progress: Lô đang trong quá trình sản xuất
 * - Complete: Lô sản xuất đã hoàn thành
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Table } from 'antd';
import { Package, Archive, TrendingUp, Clock } from 'lucide-react';
import { getInventoryStatusReport } from '../../services/reportsService';
import { apiClient } from '../../services/apiClient';
import type { InventoryStatusReport } from '../../types/reports';
import { PageWrapper, StatsGrid, StatCard, LoadingSkeleton } from '../../components/ui';

/**
 * DashboardOperator - Component chính hiển thị tổng quan cho Operator
 * 
 * Hiển thị 4 chỉ số KPI chính:
 * 1. Total Lots: Tổng số lô hàng trong kho
 * 2. Quarantine Lots: Số lô đang cách ly chờ QC
 * 3. Total Transactions: Tổng số giao dịch kho đã thực hiện
 * 4. Depleted Lots: Số lô đã cạn kiệt cần nhập thêm
 * 
 * Bảng hiển thị 10 lô hàng gần nhất để Operator nắm bắt tình hình kho
 */
export default function DashboardOperator() {
  // State quản lý trạng thái tải dữ liệu
  const [loading, setLoading] = useState(true);
  // State lưu thông báo lỗi
  const [error, setError] = useState<string | null>(null);
  // State lưu báo cáo tồn kho
  const [inventory, setInventory] = useState<InventoryStatusReport | null>(null);
  // State lưu tổng số giao dịch của Operator
  const [transactionTotal, setTransactionTotal] = useState(0);

  // Tải dữ liệu khi component mount (chỉ chạy 1 lần)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Tải song song 2 API: báo cáo tồn kho và tổng số giao dịch cá nhân
        const [inventoryReport, txResult] = await Promise.all([
          getInventoryStatusReport(),
          apiClient.get<any>('/transactions/my-history', { params: { page: 1, limit: 1 } }),
        ]);
        setInventory(inventoryReport);
        setTransactionTotal(txResult.data?.payload?.pagination?.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu dashboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  // Tính số lô đã cạn kiệt (status = 'Depleted') - Sử dụng useMemo để tối ưu hiệu năng
  const depletedCount = useMemo(
    () => (inventory?.items || []).filter((item) => item.status === 'Depleted').length,
    [inventory],
  );

  // Tính số lô đang bị quarantine (status = 'Quarantine') - Cần chú ý ưu tiên xử lý
  const quarantineCount = useMemo(
    () => (inventory?.items || []).filter((item) => item.status === 'Quarantine').length,
    [inventory],
  );

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
        <div className="animate-fadeInUp">
          <h1 className="text-2xl font-bold text-gray-900">Operator Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Daily warehouse operations snapshot</p>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {/* Stats Grid */}
        <StatsGrid cols={4}>
          <div className="stagger-item" style={{ animationDelay: '0ms' }}>
            <StatCard
              label="Total Lots"
              value={inventory?.total_lots || 0}
              icon={<Package className="w-5 h-5" />}
            />
          </div>
          <div className="stagger-item" style={{ animationDelay: '50ms' }}>
            <StatCard
              label="Quarantine Lots"
              value={quarantineCount}
              icon={<Clock className="w-5 h-5" />}
              variant="warning"
            />
          </div>
          <div className="stagger-item" style={{ animationDelay: '100ms' }}>
            <StatCard
              label="Total Transactions"
              value={transactionTotal}
              icon={<TrendingUp className="w-5 h-5" />}
            />
          </div>
          <div className="stagger-item" style={{ animationDelay: '150ms' }}>
            <StatCard
              label="Depleted Lots"
              value={depletedCount}
              icon={<Archive className="w-5 h-5" />}
              variant={depletedCount > 0 ? 'warning' : 'success'}
            />
          </div>
        </StatsGrid>

        {/* Recent Activity Placeholder */}
        <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
          <Card title="Recent Inventory" className="hover:shadow-md transition-shadow duration-200">
            <Table
              rowKey="lot_id"
              pagination={{ pageSize: 6 }}
              dataSource={inventory?.items?.slice(0, 10) || []}
              columns={[
                { title: 'Material', dataIndex: 'material_id' },
                { title: 'Lot', dataIndex: 'lot_id' },
                { title: 'Quantity', dataIndex: 'quantity' },
                { title: 'Status', dataIndex: 'status' },
              ]}
              size="middle"
              locale={{ emptyText: 'No inventory data available' }}
            />
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}