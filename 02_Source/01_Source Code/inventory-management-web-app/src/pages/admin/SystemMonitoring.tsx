import { useState, useEffect } from 'react';
import { Alert, Table, Tag, Badge } from 'antd';
import { RefreshCw, Cpu, HardDrive, Server, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { PageWrapper, StatsGrid, StatCard, LoadingSkeleton } from '../../components/ui';

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'unknown';
}

interface SystemMetrics {
  cpu: { usage: number; cores: number; model: string };
  memory: { total_gb: number; used_gb: number; available_gb: number; usage_percent: number };
  disk: { total_gb: number; used_gb: number; available_gb: number; usage_percent: number };
  services: ServiceStatus[];
  timestamp: string;
}

interface SystemAlert {
  timestamp: string;
  type: string;
  message: string;
}

function UsageBar({ value, threshold = 80 }: { value: number; threshold?: number }) {
  const color = value >= threshold ? '#ef4444' : value >= 70 ? '#f59e0b' : '#22c55e';
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function MetricCard({ title, icon, usage, detail, threshold = 80 }: {
  title: string; icon: React.ReactNode; usage: number; detail: string; threshold?: number;
}) {
  const color = usage >= threshold ? 'text-red-500' : usage >= 70 ? 'text-amber-500' : 'text-green-500';
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-600 font-semibold text-sm">{icon}{title}</div>
        <span className={`text-2xl font-black ${color}`}>{Math.round(usage)}%</span>
      </div>
      <div className="text-xs text-gray-400 mb-1">{detail}</div>
      <UsageBar value={usage} threshold={threshold} />
    </div>
  );
}

export default function SystemMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        apiClient.get<SystemMetrics>('/system-monitoring/metrics'),
        apiClient.get<{ alerts: SystemAlert[] }>('/system-monitoring/alerts', { params: { limit: 10 } }),
      ]);

      if (metricsRes.error) throw new Error(metricsRes.error.message || 'Không thể tải metrics');
      if (alertsRes.error) throw new Error(alertsRes.error.message || 'Không thể tải cảnh báo');

      setMetrics(metricsRes.data);
      setAlerts(alertsRes.data?.alerts || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const serviceColumns = [
    {
      title: 'Tên dịch vụ',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-medium text-gray-800">{name}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'running') return <Badge status="success" text="Đang chạy" />;
        if (status === 'stopped') return <Badge status="error" text="Dừng" />;
        return <Badge status="default" text="Không rõ" />;
      },
    },
  ];

  const alertColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (ts: string) => <span className="text-xs text-gray-500">{new Date(ts).toLocaleString('vi-VN')}</span>,
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="red">{type}</Tag>,
    },
    { title: 'Nội dung', dataIndex: 'message', key: 'message' },
  ];

  if (loading && !metrics) {
    return (
      <PageWrapper>
        <div className="p-6">
          <LoadingSkeleton variant="text" className="w-64 h-8 mb-2" />
          <LoadingSkeleton variant="text" className="w-48 h-4 mb-6" />
          <StatsGrid cols={3}><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /></StatsGrid>
        </div>
      </PageWrapper>
    );
  }

  const runningCount = metrics?.services.filter(s => s.status === 'running').length ?? 0;
  const totalServices = metrics?.services.length ?? 0;

  return (
    <PageWrapper>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between animate-fadeInUp">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Giám sát hệ thống</h1>
            <p className="text-sm text-gray-500 mt-1">
              {lastUpdated ? `Cập nhật lúc ${lastUpdated.toLocaleTimeString('vi-VN')}` : 'Thời gian thực'}
            </p>
          </div>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {error && <Alert type="error" showIcon message={error} />}

        {metrics && (
          <>
            <StatsGrid cols={4}>
              <StatCard label="Dịch vụ đang chạy" value={`${runningCount}/${totalServices}`} icon={<Server className="w-5 h-5" />} />
              <StatCard label="CPU" value={`${Math.round(metrics.cpu.usage)}%`} icon={<Cpu className="w-5 h-5" />} variant={metrics.cpu.usage >= 80 ? 'error' : 'default'} />
              <StatCard label="RAM" value={`${Math.round(metrics.memory.usage_percent)}%`} icon={<Server className="w-5 h-5" />} variant={metrics.memory.usage_percent >= 85 ? 'error' : 'default'} />
              <StatCard label="Disk" value={`${Math.round(metrics.disk.usage_percent)}%`} icon={<HardDrive className="w-5 h-5" />} variant={metrics.disk.usage_percent >= 90 ? 'error' : 'default'} />
            </StatsGrid>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="CPU" icon={<Cpu size={16} />} usage={metrics.cpu.usage} detail={`${metrics.cpu.cores} nhân — ${metrics.cpu.model}`} threshold={80} />
              <MetricCard title="RAM" icon={<Server size={16} />} usage={metrics.memory.usage_percent} detail={`${metrics.memory.used_gb.toFixed(1)} / ${metrics.memory.total_gb} GB`} threshold={85} />
              <MetricCard title="Ổ đĩa" icon={<HardDrive size={16} />} usage={metrics.disk.usage_percent} detail={`${metrics.disk.used_gb.toFixed(1)} / ${metrics.disk.total_gb} GB`} threshold={90} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Server size={18} className="text-primary-600" />Trạng thái dịch vụ
                </h2>
                <Table dataSource={metrics.services} columns={serviceColumns} rowKey="name" pagination={false} size="small" />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500" />Cảnh báo gần đây
                </h2>
                {alerts.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm py-4">
                    <CheckCircle size={16} />Không có cảnh báo
                  </div>
                ) : (
                  <Table dataSource={alerts} columns={alertColumns} rowKey={(_, i) => String(i)} pagination={false} size="small" />
                )}
              </div>
            </div>
          </>
        )}

        {!metrics && !loading && !error && (
          <div className="text-center py-12 text-gray-400">Không có dữ liệu</div>
        )}
      </div>
    </PageWrapper>
  );
}
