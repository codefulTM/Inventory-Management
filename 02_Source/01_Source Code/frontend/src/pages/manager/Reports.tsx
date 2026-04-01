import { useEffect, useState } from 'react';
import { Alert, Card, Spin, Table, Tabs } from 'antd';
import {
  getAuditReport,
  getInventoryStatusReport,
  getMaterialUsageReport,
  getQcPerformanceReport,
} from '../../services/reportsService';
import type {
  AuditReport,
  InventoryStatusReport,
  MaterialUsageReport,
  QcPerformanceReport,
} from '../../types/reports';

export default function ReportsManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatusReport | null>(null);
  const [materialUsage, setMaterialUsage] = useState<MaterialUsageReport | null>(null);
  const [qcPerformance, setQcPerformance] = useState<QcPerformanceReport | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [inventory, usage, qc, audit] = await Promise.all([
          getInventoryStatusReport(),
          getMaterialUsageReport(),
          getQcPerformanceReport(),
          getAuditReport(),
        ]);

        setInventoryStatus(inventory);
        setMaterialUsage(usage);
        setQcPerformance(qc);
        setAuditReport(audit);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Inventory, usage, quality and audit snapshots</p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card>
        {loading ? (
          <div className="py-12 text-center">
            <Spin />
          </div>
        ) : (
          <Tabs
            items={[
              {
                key: 'inventory',
                label: 'Inventory Status',
                children: (
                  <Table
                    rowKey="lot_id"
                    pagination={{ pageSize: 8 }}
                    dataSource={inventoryStatus?.items || []}
                    columns={[
                      { title: 'Material', dataIndex: 'material_id' },
                      { title: 'Lot', dataIndex: 'lot_id' },
                      { title: 'Quantity', dataIndex: 'quantity' },
                      { title: 'Status', dataIndex: 'status' },
                    ]}
                  />
                ),
              },
              {
                key: 'usage',
                label: 'Material Usage',
                children: (
                  <Table
                    rowKey="material_id"
                    pagination={{ pageSize: 8 }}
                    dataSource={materialUsage?.items || []}
                    columns={[
                      { title: 'Material', dataIndex: 'material_id' },
                      { title: 'Transactions', dataIndex: 'transaction_count' },
                      { title: 'Total Qty', dataIndex: 'total_quantity' },
                    ]}
                  />
                ),
              },
              {
                key: 'qc',
                label: 'QC Performance',
                children: (
                  <Table
                    rowKey="supplier_name"
                    pagination={{ pageSize: 8 }}
                    dataSource={qcPerformance?.items || []}
                    columns={[
                      { title: 'Supplier', dataIndex: 'supplier_name' },
                      { title: 'Approved', dataIndex: 'approved' },
                      { title: 'Rejected', dataIndex: 'rejected' },
                      { title: 'Quality Rate %', dataIndex: 'quality_rate' },
                    ]}
                  />
                ),
              },
              {
                key: 'audit',
                label: 'Audit Trail',
                children: (
                  <Table
                    rowKey={(record) => `${record.entity}-${record.performed_at}-${record.action}`}
                    pagination={{ pageSize: 8 }}
                    dataSource={auditReport?.entries || []}
                    columns={[
                      { title: 'Action', dataIndex: 'action' },
                      { title: 'Entity', dataIndex: 'entity' },
                      { title: 'By', dataIndex: 'performed_by' },
                      { title: 'At', dataIndex: 'performed_at' },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
