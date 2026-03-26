import { useEffect, useState } from 'react';
import { Alert, Card, Table, Tag } from 'antd';
import { getInventoryStatusReport } from '../../services/reportsService';

type ServiceStatus = {
  service: string;
  status: 'Online' | 'Degraded';
  latencyMs: number;
};

export default function SystemMonitoring() {
  const [error, setError] = useState<string | null>(null);
  const [statusRows, setStatusRows] = useState<Array<{ status: string; count: number }>>([]);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const report = await getInventoryStatusReport();
        const counts = report.items.reduce<Record<string, number>>((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {});
        setStatusRows(Object.entries(counts).map(([status, count]) => ({ status, count })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load monitoring data');
      }
    };

    void load();
  }, []);

  const services: ServiceStatus[] = [
    { service: 'Frontend', status: 'Online', latencyMs: 40 },
    { service: 'Backend API', status: 'Online', latencyMs: 62 },
    { service: 'MongoDB', status: 'Online', latencyMs: 31 },
  ];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
        <p className="text-sm text-gray-500">Service uptime and inventory-status telemetry</p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card title="Service Health">
        <Table
          rowKey="service"
          pagination={false}
          dataSource={services}
          columns={[
            { title: 'Service', dataIndex: 'service' },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (value: ServiceStatus['status']) => (
                <Tag color={value === 'Online' ? 'green' : 'orange'}>{value}</Tag>
              ),
            },
            { title: 'Latency (ms)', dataIndex: 'latencyMs' },
          ]}
        />
      </Card>

      <Card title="Inventory Status Distribution">
        <Table
          rowKey="status"
          pagination={false}
          dataSource={statusRows}
          columns={[
            { title: 'Lot Status', dataIndex: 'status' },
            { title: 'Count', dataIndex: 'count' },
          ]}
        />
      </Card>
    </div>
  );
}
