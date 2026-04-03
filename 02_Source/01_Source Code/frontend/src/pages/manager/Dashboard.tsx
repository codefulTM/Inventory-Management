import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Divider,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
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

function isLowStock(quantity: number): boolean {
  return quantity <= 100;
}

export default function DashboardManager() {
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
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const lowStockItems = useMemo(
    () => (inventoryStatus?.items || []).filter((item) => isLowStock(item.quantity)),
    [inventoryStatus],
  );

  const totalUsageQuantity = useMemo(
    () =>
      (materialUsage?.items || []).reduce(
        (sum, item) => sum + (Number(item.total_quantity) || 0),
        0,
      ),
    [materialUsage],
  );

  const averageQcRate = useMemo(() => {
    const items = qcPerformance?.items || [];
    if (items.length === 0) return 0;
    const total = items.reduce((sum, item) => sum + (Number(item.quality_rate) || 0), 0);
    return Number((total / items.length).toFixed(2));
  }, [qcPerformance]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-sm text-gray-500">
          Real-time inventory overview, quality trend and recent operations
        </p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      {loading ? (
        <div className="py-16 text-center">
          <Spin />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic
                  title="Total Lots"
                  value={inventoryStatus?.total_lots || 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic
                  title="Low-Stock Lots"
                  value={lowStockItems.length}
                  valueStyle={{ color: lowStockItems.length > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic
                  title="Total Material Usage"
                  value={totalUsageQuantity}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic
                  title="Average QC Pass Rate"
                  value={averageQcRate}
                  precision={2}
                  suffix="%"
                />
              </Card>
            </Col>
          </Row>

          <Card title="Low-Stock Watchlist" className="mt-4">
            <Table
              rowKey="lot_id"
              pagination={{ pageSize: 6 }}
              dataSource={lowStockItems}
              columns={[
                { title: 'Material', dataIndex: 'material_id' },
                { title: 'Lot', dataIndex: 'lot_id' },
                {
                  title: 'Quantity',
                  dataIndex: 'quantity',
                  render: (value: number) => (
                    <Tag color={isLowStock(value) ? 'red' : 'green'}>{value}</Tag>
                  ),
                },
                { title: 'Status', dataIndex: 'status' },
              ]}
            />
          </Card>

          <Row gutter={[16, 16]} className="mt-4">
            <Col xs={24} xl={12}>
              <Card title="QC Performance by Supplier">
                <Table
                  rowKey="supplier_name"
                  pagination={{ pageSize: 6 }}
                  dataSource={qcPerformance?.items || []}
                  columns={[
                    { title: 'Supplier', dataIndex: 'supplier_name' },
                    { title: 'Approved', dataIndex: 'approved' },
                    { title: 'Rejected', dataIndex: 'rejected' },
                    {
                      title: 'Quality Rate',
                      dataIndex: 'quality_rate',
                      render: (value: number) => `${Number(value || 0).toFixed(2)}%`,
                    },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title="Recent Audit Events">
                <Table
                  rowKey={(record) => `${record.entity}-${record.performed_at}-${record.action}`}
                  pagination={{ pageSize: 6 }}
                  dataSource={(auditReport?.entries || []).slice(0, 20)}
                  columns={[
                    { title: 'Action', dataIndex: 'action' },
                    { title: 'Entity', dataIndex: 'entity' },
                    { title: 'By', dataIndex: 'performed_by' },
                    { title: 'At', dataIndex: 'performed_at' },
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          <p className="text-xs text-gray-400 m-0">
            Last sync: {inventoryStatus?.generated_at || materialUsage?.generated_at || qcPerformance?.generated_at || auditReport?.generated_at || 'N/A'}
          </p>
        </>
      )}
    </div>
  );
}
