import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Table } from 'antd';
import { Package, Archive, TrendingUp, Clock } from 'lucide-react';
import { getInventoryStatusReport } from '../../services/reportsService';
import { transactionService } from '../../services/transactionService';
import type { InventoryStatusReport } from '../../types/reports';
import { PageWrapper, StatsGrid, StatCard, LoadingSkeleton } from '../../components/ui';

export default function DashboardOperator() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryStatusReport | null>(null);
  const [transactionTotal, setTransactionTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [inventoryReport, txResult] = await Promise.all([
          getInventoryStatusReport(),
          transactionService.getTransactions({}, 1, 1),
        ]);
        setInventory(inventoryReport);
        setTransactionTotal(txResult.pagination?.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load operator dashboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const depletedCount = useMemo(
    () => (inventory?.items || []).filter((item) => item.status === 'Depleted').length,
    [inventory],
  );

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