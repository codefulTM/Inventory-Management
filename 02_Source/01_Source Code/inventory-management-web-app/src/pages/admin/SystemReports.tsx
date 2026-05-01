import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Row, Table } from 'antd';
import { getAuditReport, getInventoryStatusReport, getQcPerformanceReport } from '../../services/reportsService';

type ReportRow = {
  name: string;
  value: number | string;
};

export default function SystemReports() {
  const [error, setError] = useState<string | null>(null);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [depleted, setDepleted] = useState(0);
  const [qcPassRate, setQcPassRate] = useState<number | null>(null);
  const [auditEntries, setAuditEntries] = useState(0);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const [inventory, qc, audit] = await Promise.all([
          getInventoryStatusReport(),
          getQcPerformanceReport(),
          getAuditReport(),
        ]);
        setInventoryTotal(inventory.total_lots);
        setDepleted(
          inventory.items.filter((item) => item.status === 'Depleted').length,
        );
        const totalApproved = qc.items.reduce((sum, item) => sum + item.approved, 0);
        const totalRejected = qc.items.reduce((sum, item) => sum + item.rejected, 0);
        const totalQc = totalApproved + totalRejected;
        setQcPassRate(totalQc > 0 ? Number(((totalApproved / totalQc) * 100).toFixed(2)) : null);
        setAuditEntries(audit.entries.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      }
    };

    void load();
  }, []);

  const summaryRows = useMemo<ReportRow[]>(
    () => [
      { name: 'Total Inventory Lots', value: inventoryTotal },
      { name: 'Depleted Lots', value: depleted },
      { name: 'QC Pass Rate', value: qcPassRate == null ? 'N/A' : `${qcPassRate}%` },
      { name: 'Audit Entries', value: auditEntries },
    ],
    [auditEntries, depleted, inventoryTotal, qcPassRate]
  );

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Reports</h1>
        <p className="text-sm text-gray-500">Cross-domain operational summary for IT administrators</p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Inventory Health">
            <Table
              rowKey="name"
              size="small"
              pagination={false}
              dataSource={summaryRows.filter((row) => /Inventory|Depleted/.test(row.name))}
              columns={[
                { title: 'Metric', dataIndex: 'name' },
                { title: 'Value', dataIndex: 'value' },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Quality & Audit">
            <Table
              rowKey="name"
              size="small"
              pagination={false}
              dataSource={summaryRows.filter((row) => /QC|Audit/.test(row.name))}
              columns={[
                { title: 'Metric', dataIndex: 'name' },
                { title: 'Value', dataIndex: 'value' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
