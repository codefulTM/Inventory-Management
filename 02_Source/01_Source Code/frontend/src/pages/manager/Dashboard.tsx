import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Modal,
  Row,
  Select,
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
import Sparkline from '../../components/Sparkline';
import {
  getDashboardSummary,
  getDashboardTrends,
  getDashboardDrilldown,
} from '../../services/dashboardService';
import { fetchWarehouses } from '../../services/warehouseService';
import type { Warehouse } from '../../types/warehouse';

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
  // US17 minimal additions
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [trendsIn, setTrendsIn] = useState<Array<{ period: string; total_quantity: number }>>([]);
  const [trendsOut, setTrendsOut] = useState<Array<{ period: string; total_quantity: number }>>([]);
  const [drilldownVisible, setDrilldownVisible] = useState(false);
  const [drilldownData, setDrilldownData] = useState<any>({ items: [], total: 0, page: 1 });
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [inventory, usage, qc, audit, whs] = await Promise.all([
          getInventoryStatusReport(),
          getMaterialUsageReport(),
          getQcPerformanceReport(),
          getAuditReport(),
          fetchWarehouses(1, 200),
        ]);

        setInventoryStatus(inventory);
        setMaterialUsage(usage);
        setQcPerformance(qc);
        setAuditReport(audit);
        setWarehouses(whs.data || []);
        // load minimal dashboard summary and trends
        const sumResp = await getDashboardSummary();
        if (sumResp.data) setSummary(sumResp.data);
        const now = new Date();
        const from = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
        const to = now.toISOString();
        const inResp = await getDashboardTrends('in', from, to, 'day');
        const outResp = await getDashboardTrends('out', from, to, 'day');
        if (inResp.data) setTrendsIn(inResp.data);
        if (outResp.data) setTrendsOut(outResp.data);
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
                <Statistic title="Inventory Value" value={summary?.total_value ?? 0} precision={2} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic title="In Volume (7d)" value={trendsIn.reduce((s, r) => s + (r.total_quantity || 0), 0)} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic title="Out Volume (7d)" value={trendsOut.reduce((s, r) => s + (r.total_quantity || 0), 0)} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic title="Top Materials" value={Array.isArray(summary?.top_materials) ? summary.top_materials.length : 0} />
              </Card>
            </Col>
          </Row>

          {/* Filter bar + Trends */}
          <Card className="mt-4">
            <Row gutter={[12, 12]} align="middle">
              <Col>
                <DatePicker.RangePicker onChange={(dates) => setDateRange(dates)} />
              </Col>
              <Col>
                <Select
                  style={{ width: 220 }}
                  placeholder="Warehouse"
                  allowClear
                  onChange={(v) => setFilterWarehouse(v)}
                  options={(warehouses || []).map((w) => ({ label: w.warehouse_name || w.warehouse_id, value: w.warehouse_id }))}
                />
              </Col>
              <Col>
                <Button
                  onClick={async () => {
                    const from = dateRange?.[0] ? dateRange[0].toISOString() : undefined;
                    const to = dateRange?.[1] ? dateRange[1].toISOString() : undefined;
                    const inResp = await getDashboardTrends('in', from, to, 'day', filterWarehouse);
                    const outResp = await getDashboardTrends('out', from, to, 'day', filterWarehouse);
                    if (inResp.data) setTrendsIn(inResp.data);
                    if (outResp.data) setTrendsOut(outResp.data);
                  }}
                >
                  Apply
                </Button>
              </Col>
            </Row>

            <Row gutter={[12, 12]} className="mt-4">
              <Col xs={24} lg={12}>
                <h3 className="m-0">In (Receipts)</h3>
                <Sparkline
                  points={(trendsIn || []).map((r) => ({ x: r.period, y: r.total_quantity }))}
                  onPointClick={async (_i, p) => {
                    setDrilldownVisible(true);
                    setDrilldownLoading(true);
                    const resp = await getDashboardDrilldown(1, 20, undefined, p.x, p.x);
                    if (resp.data) setDrilldownData(resp.data);
                    setDrilldownLoading(false);
                  }}
                />
              </Col>
              <Col xs={24} lg={12}>
                <h3 className="m-0">Out (Usage)</h3>
                <Sparkline
                  points={(trendsOut || []).map((r) => ({ x: r.period, y: r.total_quantity }))}
                  onPointClick={async (_i, p) => {
                    setDrilldownVisible(true);
                    setDrilldownLoading(true);
                    const resp = await getDashboardDrilldown(1, 20, undefined, p.x, p.x);
                    if (resp.data) setDrilldownData(resp.data);
                    setDrilldownLoading(false);
                  }}
                />
              </Col>
            </Row>
          </Card>

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

          <Modal
            title="Drilldown Transactions"
            open={drilldownVisible}
            onCancel={() => setDrilldownVisible(false)}
            footer={null}
            width={900}
          >
            <Table
              loading={drilldownLoading}
              dataSource={drilldownData.items || []}
              rowKey={(r: any) => r.transaction_id || r._id}
              pagination={{
                pageSize: drilldownData.limit || 20,
                total: drilldownData.total || 0,
                current: drilldownData.page || 1,
              }}
              columns={[
                { title: 'Transaction ID', dataIndex: 'transaction_id' },
                { title: 'Lot', dataIndex: 'lot_id' },
                { title: 'Type', dataIndex: 'transaction_type' },
                { title: 'Quantity', dataIndex: 'quantity' },
                { title: 'Date', dataIndex: 'transaction_date' },
              ]}
            />
          </Modal>
        </>
      )}
    </div>
  );
}
