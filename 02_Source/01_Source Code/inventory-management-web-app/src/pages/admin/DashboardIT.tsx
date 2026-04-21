import { useEffect, useState } from 'react';
import { Alert, Card, Table } from 'antd';
import { Package, Server, Shield } from 'lucide-react';
import { getAuditReport, getInventoryStatusReport } from '../../services/reportsService';
import type { AuditReport } from '../../types/reports';
import { PageWrapper, StatsGrid, StatCard, LoadingSkeleton } from '../../components/ui';

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  LOGOUT_SUCCESS: 'Đăng xuất',
  LOGOUT_FAILED: 'Đăng xuất thất bại',
  USER_CREATED: 'Tạo tài khoản',
  USER_UPDATED: 'Cập nhật tài khoản',
  USER_LOCKED: 'Khóa tài khoản',
  USER_UNLOCKED: 'Mở khóa tài khoản',
  PASSWORD_RESET_REQUESTED: 'Yêu cầu đặt lại mật khẩu',
  PASSWORD_RESET_COMPLETED: 'Đặt lại mật khẩu thành công',
  INVENTORY_LOT_UPDATED: 'Cập nhật lô hàng',
};

function formatDateShort(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yy}, ${hours}:${mins}`;
}

export default function DashboardIT() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lots, setLots] = useState(0);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);

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
        setAuditReport(audit);
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
              value={auditReport?.entries?.length ?? 0}
              icon={<Shield className="w-5 h-5" />}
              variant={(auditReport?.entries?.length ?? 0) > 0 ? 'warning' : 'success'}
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

        {/* Audit Activity Table */}
        <Card
          title="Hoạt Động Hệ Thống Gần Đây"
          className="hover:shadow-md transition-shadow duration-200"
        >
          <Table
            rowKey={(_: any, index?: number) => String(index ?? 0)}
            pagination={{ pageSize: 10 }}
            dataSource={(auditReport?.entries || []).slice(0, 100)}
            columns={[
              {
                title: 'Hành động',
                width: 220,
                render: (_: any, record: any) => {
                  const raw = record.action || record.verb || record.event
                    || (record.details && (record.details.action as string)) || '';
                  return ACTION_LABELS[raw] || raw || '-';
                },
              },
              {
                title: 'Đối tượng',
                render: (_: any, record: any) => {
                  const entity = record.entity || record.entity_name || record.target
                    || (record.details && (
                      (record.details.entity as string)
                      || (record.details.lot_id as string)
                      || (record.details.transaction_id as string)
                      || (record.details.user_id as string)
                    )) || '';
                  return entity || '—';
                },
              },
              {
                title: 'Người thực hiện',
                render: (_: any, record: any) =>
                  record.performed_by || record.username || record.user || record.actor
                  || (record.details && (record.details.user as string)) || '—',
              },
              {
                title: 'Thời gian',
                render: (_: any, record: any) =>
                  formatDateShort(record.performed_at || record.performedAt || record.timestamp),
              },
            ]}
            size="middle"
          />
        </Card>
      </div>
    </PageWrapper>
  );
}