import { useEffect, useState } from 'react';
import { Alert, Card, Table, Tag } from 'antd';
import { getAuditReport } from '../../services/reportsService';
import type { AuditEntry } from '../../types/reports';

export default function ErrorLogs() {
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AuditEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const report = await getAuditReport();
        setRows(report.entries || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load logs');
      }
    };

    void load();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Error & Audit Logs</h1>
        <p className="text-sm text-gray-500">Centralized operational trail for diagnostics</p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card>
        <Table
          rowKey={(record) => `${record.entity}-${record.performed_at}-${record.action}`}
          dataSource={rows}
          pagination={{ pageSize: 12 }}
          columns={[
            {
              title: 'Action',
              dataIndex: 'action',
              render: (value: string) => {
                const isSuspicious = /error|fail|denied|reject/i.test(value || '');
                return <Tag color={isSuspicious ? 'red' : 'blue'}>{value}</Tag>;
              },
            },
            { title: 'Entity', dataIndex: 'entity' },
            { title: 'By', dataIndex: 'performed_by' },
            { title: 'At', dataIndex: 'performed_at' },
          ]}
        />
      </Card>
    </div>
  );
}
