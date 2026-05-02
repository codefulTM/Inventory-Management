/**
 * DashboardIT - Trang tổng quan dành cho Quản trị viên hệ thống (IT Administrator)
 * 
 * Chức năng chính:
 * - Hiển thị thống kê nhanh: số lượng lô hàng đang theo dõi, số sự kiện audit gần đây, trạng thái dịch vụ
 * - Bảng hiển thị 100 sự kiện audit gần nhất (đăng nhập, tạo user, cập nhật lô hàng, etc.)
 * - Sử dụng dữ liệu từ inventory status report và audit report
 * 
 * Quyền truy cập: Chỉ IT Administrator (/admin/*)
 */

import { useEffect, useState } from 'react';
import { Alert, Card, Table } from 'antd';
import { Package, Server, Shield } from 'lucide-react';
import { getAuditReport, getInventoryStatusReport } from '../../services/reportsService';
import type { AuditReport } from '../../types/reports';
import { PageWrapper, StatsGrid, StatCard, LoadingSkeleton } from '../../components/ui';

/**
 * Bảng ánh xạ mã action (từ backend) sang tiếng Việt để hiển thị thân thiện trong bảng audit
 * Các action bao gồm: đăng nhập, đăng xuất, tạo/cập nhật/khóa user, đặt lại mật khẩu, cập nhật lô hàng
 */
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

/**
 * Hàm định dạng ngày giờ từ ISO string sang định dạng ngắn gọn: DD-MM-YY, HH:MM
 * Dùng cho cột "Thời gian" trong bảng audit để tiết kiệm không gian hiển thị
 */
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

/**
 * Component DashboardIT - Trang chủ của IT Administrator
 * 
 * State管理:
 * - loading: trạng thái đang tải dữ liệu
 * - error: lưu thông báo lỗi (nếu có)
 * - lots: tổng số lô hàng đang được theo dõi
 * - auditReport: dữ liệu báo cáo audit từ backend
 * 
 * useEffect: Tự động tải dữ liệu khi component mount (gọi song song 2 API)
 */
export default function DashboardIT() {
  // State quản lý trạng thái loading và lỗi
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Số lượng lô hàng tồn kho đang theo dõi
  const [lots, setLots] = useState(0);
  // Dữ liệu báo cáo audit hệ thống
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lots, setLots] = useState(0);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);

  // useEffect: Tự động gọi API lấy dữ liệu khi component được mount
  // Sử dụng Promise.all để gọi song song 2 API: inventory status và audit report (tối ưu thời gian tải)
  useEffect(() => {
    // Hàm bất đồng bộ tải dữ liệu từ backend
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Gọi song song 2 API: báo cáo tồn kho và báo cáo audit để tăng tốc độ tải
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

  // Giao diện: Hiển thị skeleton loading khi đang tải, sau đó hiển thị dashboard hoàn chỉnh
  return (
    <PageWrapper>
      <div className="p-6 space-y-6">
        {/* Phần tiêu đề trang */}
        <div className="animate-fadeInUp">
          <h1 className="text-2xl font-bold text-gray-900">IT Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">System health and operational overview</p>
        </div>

        {/* Hiển thị thông báo lỗi nếu có */}
        {error ? <Alert type="error" showIcon message={error} /> : null}

        {/* Khu vực hiển thị 3 thẻ KPI: Tracked Lots, Audit Events, Core Services */}
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

        {/* Bảng hiển thị 100 sự kiện audit gần nhất (đăng nhập, thay đổi user, cập nhật lô hàng...) */}
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