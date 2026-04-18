import { useEffect, useState } from 'react';
import { Alert } from 'antd';
import { Package, Server, Shield } from 'lucide-react';
import { getAuditReport, getInventoryStatusReport } from '../../services/reportsService';
import { PageWrapper, StatsGrid, StatCard, LoadingSkeleton } from '../../components/ui';

export default function DashboardIT() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lots, setLots] = useState(0);
  const [events, setEvents] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [inventory, audit] = await Promise.all([
          getInventoryStatusReport(),
          getAuditReport(),
        ]);
        setLots(inventory.total_lots || 0);
        setEvents(audit.entries?.length || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load IT dashboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <PageWrapper>
        <div className="p-6">
          <div className="mb-6">
            <LoadingSkeleton variant="text" className="w-48 h-8" />
            <LoadingSkeleton variant="text" className="w-56 h-4 mt-2" />
          </div>
          <StatsGrid cols={3}>
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
          <h1 className="text-2xl font-bold text-gray-900">IT Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">System health and operational overview</p>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {/* Stats Grid */}
        <StatsGrid cols={3}>
          <div className="stagger-item" style={{ animationDelay: '0ms' }}>
            <StatCard
              label="Tracked Inventory Lots"
              value={lots}
              icon={<Package className="w-5 h-5" />}
            />
          </div>
          <div className="stagger-item" style={{ animationDelay: '50ms' }}>
            <StatCard
              label="Recent Audit Events"
              value={events}
              icon={<Shield className="w-5 h-5" />}
              variant={events > 0 ? 'warning' : 'success'}
            />
          </div>
          <div className="stagger-item" style={{ animationDelay: '100ms' }}>
            <StatCard
              label="Core Services"
              value="Online"
              icon={<Server className="w-5 h-5" />}
              variant="success"
            />
          </div>
        </StatsGrid>
      </div>
    </PageWrapper>
  );
}