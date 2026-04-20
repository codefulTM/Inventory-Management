import { useEffect, useMemo, useState, useRef } from "react";
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
} from "antd";
import type { ColumnsType } from 'antd/es/table';
import {
  getAuditReport,
  getInventoryStatusReport,
  getMaterialUsageReport,
  getQcPerformanceReport,
} from "../../services/reportsService";
import type {
  AuditReport,
  InventoryStatusReport,
  MaterialUsageReport,
  QcPerformanceReport,
} from "../../types/reports";
import Sparkline from "../../components/Sparkline";
import {
  getDashboardSummary,
  getDashboardTrends,
  getDashboardDrilldown,
} from "../../services/dashboardService";
import { fetchWarehouses } from "../../services/warehouseService";
import type { Warehouse } from "../../types/warehouse";

function isLowStock(quantity: number): boolean {
  return quantity <= 100;
}

export default function DashboardManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryStatus, setInventoryStatus] =
    useState<InventoryStatusReport | null>(null);
  const [materialUsage, setMaterialUsage] =
    useState<MaterialUsageReport | null>(null);
  const [qcPerformance, setQcPerformance] =
    useState<QcPerformanceReport | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  // US17 minimal additions
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState<string | undefined>(
    undefined,
  );
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [trendsIn, setTrendsIn] = useState<
    Array<{ period: string; total_quantity: number }>
  >([]);
  const [trendsOut, setTrendsOut] = useState<
    Array<{ period: string; total_quantity: number }>
  >([]);
  const [drilldownVisible, setDrilldownVisible] = useState(false);
  const [drilldownData, setDrilldownData] = useState<any>({
    items: [],
    total: 0,
    page: 1,
  });
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Compute interval based on date range length
  // - <= 30 days -> 'day'
  // - <= 180 days -> 'week'
  // - > 180 days -> 'month'
  const computeInterval = (fromIso?: string, toIso?: string): 'day' | 'week' | 'month' => {
    if (!fromIso || !toIso) return 'day';
    const fromMs = new Date(fromIso).getTime();
    const toMs = new Date(toIso).getTime();
    if (isNaN(fromMs) || isNaN(toMs) || toMs <= fromMs) return 'day';
    const days = Math.ceil((toMs - fromMs) / (1000 * 60 * 60 * 24));
    if (days > 180) return 'month';
    if (days > 30) return 'week';
    return 'day';
  };

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
        // load minimal dashboard summary and trends (default last 7 days)
        const now = new Date();
        const defaultFrom = new Date(
          now.getTime() - 7 * 24 * 3600 * 1000,
        ).toISOString();
        const defaultTo = now.toISOString();
        const from = defaultFrom;
        const to = defaultTo;
        // Initial mount: don't depend on current filterWarehouse (avoids missing-deps lint)
        const sumResp = await getDashboardSummary(undefined, from, to);
        if (sumResp.data) setSummary(sumResp.data);
        const interval = computeInterval(from, to);
        const inResp = await getDashboardTrends("in", from, to, interval, undefined);
        const outResp = await getDashboardTrends("out", from, to, interval, undefined);
        if (inResp.data) setTrendsIn(inResp.data);
        if (outResp.data) setTrendsOut(outResp.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  // mountedRef prevents the auto-refresh effect running on initial mount
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  // Helper: fetch summary + trends for a given range and warehouse
  const fetchDashboardForRange = async (fromIso: string, toIso: string, warehouseId?: string) => {
    try {
      setLoading(true);
      const sumResp = await getDashboardSummary(warehouseId, fromIso, toIso);
      if (sumResp.data) setSummary(sumResp.data);
      const interval = computeInterval(fromIso, toIso);
      const inResp = await getDashboardTrends("in", fromIso, toIso, interval, warehouseId);
      const outResp = await getDashboardTrends("out", fromIso, toIso, interval, warehouseId);
      if (inResp.data) setTrendsIn(inResp.data);
      if (outResp.data) setTrendsOut(outResp.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh Top Materials and trends when dateRange or warehouse changes (debounced)
  // Only auto-apply when the user has selected both start and end dates to avoid
  // firing requests while the user is still picking the range.
  useEffect(() => {
    if (!mountedRef.current) return;

    // Require both start and end to be selected for auto-refresh
    if (!dateRange || !dateRange[0] || !dateRange[1]) return;

    const from = dateRange[0].toISOString();
    const to = dateRange[1].toISOString();

    const timer = setTimeout(() => {
      void fetchDashboardForRange(from, to, filterWarehouse);
    }, 300);

    return () => clearTimeout(timer);
  }, [dateRange, filterWarehouse]);

  const lowStockItems = useMemo(
    () =>
      (inventoryStatus?.items || []).filter((item) =>
        isLowStock(item.quantity),
      ),
    [inventoryStatus],
  );

  // removed unused derived values (were causing TS unused variable errors)

  type TopMaterialRow = {
    key: string;
    material_id: string;
    material_name: string;
    total_quantity: number;
  };

  const topMaterialsColumns: ColumnsType<TopMaterialRow> = [
    {
      title: 'Xếp hạng',
      key: 'rank',
      width: 60,
      render: (_value: any, _record: TopMaterialRow, idx: number) => idx + 1,
    },
    { title: 'Mã vật liệu', dataIndex: 'material_id', key: 'material_id' },
    { title: 'Tên vật liệu', dataIndex: 'material_name', key: 'material_name' },
    {
      title: 'Số lượng',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      align: 'right',
      render: (v: any) => Number(v || 0).toLocaleString(),
    },
  ];

  // no client-side material name lookup required — backend returns `material_name` in summary.top_materials


  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-sm text-gray-500">
          Real-time inventory overview, quality trend and recent operations
        </p>
      </div>

      {/* Top controls: Range picker + Warehouse + Apply */}
      <Row gutter={[12, 12]} align="middle">
        <Col>
          <DatePicker.RangePicker
            value={dateRange as any}
            onChange={(dates) => setDateRange(dates)}
          />
        </Col>
        <Col>
          <Select
            style={{ width: 220 }}
            placeholder="Warehouse"
            allowClear
            value={filterWarehouse}
            onChange={(v) => setFilterWarehouse(v)}
            options={(warehouses || []).map((w) => ({
              label: w.warehouse_name || w.warehouse_id,
              value: w.warehouse_id,
            }))}
          />
        </Col>
        <Col>
          <Button
            onClick={async () => {
              // Nếu người dùng không chọn range thì dùng mặc định last 7 days
              const now = new Date();
              const defaultFrom = new Date(
                now.getTime() - 7 * 24 * 3600 * 1000,
              ).toISOString();
              const defaultTo = now.toISOString();

              const from = dateRange?.[0]
                ? dateRange[0].toISOString()
                : defaultFrom;
              const to = dateRange?.[1] ? dateRange[1].toISOString() : defaultTo;

              const interval = computeInterval(from, to);

              // Fetch updated summary and trends based on selection
              const sumResp = await getDashboardSummary(
                filterWarehouse,
                from,
                to,
              );
              if (sumResp.data) setSummary(sumResp.data);

              const inResp = await getDashboardTrends(
                "in",
                from,
                to,
                interval,
                filterWarehouse,
              );
              const outResp = await getDashboardTrends(
                "out",
                from,
                to,
                interval,
                filterWarehouse,
              );
              if (inResp.data) setTrendsIn(inResp.data);
              if (outResp.data) setTrendsOut(outResp.data);
            }}
          >
            Apply
          </Button>
        </Col>
      </Row>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      {loading ? (
        <div className="py-16 text-center">
          <Spin />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8} xl={8}>
              <Card>
                <Statistic
                  title="Inventory Value"
                  value={summary?.total_value ?? 0}
                  precision={2}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8} xl={8}>
              <Card>
                <Statistic
                  title="In Volume"
                  value={trendsIn.reduce(
                    (s, r) => s + (Number(r.total_quantity) || 0),
                    0,
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8} xl={8}>
              <Card>
                <Statistic
                  title="Out Volume"
                  value={trendsOut.reduce(
                    (s, r) => s + (Number(r.total_quantity) || 0),
                    0,
                  )}
                />
              </Card>
            </Col>
          </Row>

          <Row className="mt-4">
            <Col xs={24} lg={24}>
              <Card title="Top Materials">
                <Table<TopMaterialRow>
                  size="small"
                  columns={topMaterialsColumns}
                  dataSource={
                    Array.isArray(summary?.top_materials)
                      ? (summary.top_materials as any[]).map((m) => ({
                          key: m.material_id,
                          material_id: m.material_id,
                          material_name: m.material_name || m.material_id,
                          total_quantity: m.total_quantity,
                        }))
                      : []
                  }
                  pagination={false}
                />
              </Card>
            </Col>
          </Row>

          {/* Filter bar + Trends */}
          <Card className="mt-4">
            <Row gutter={[12, 12]} className="mt-4">
              <Col xs={24} lg={12}>
                <h3 className="m-0">In (Receipts)</h3>
                <Sparkline
                  points={(trendsIn || []).map((r) => ({
                    x: r.period,
                    y: Number(r.total_quantity) || 0,
                  }))}
                  onPointClick={async (_i, p) => {
                    setDrilldownVisible(true);
                    setDrilldownLoading(true);
                    // p.x is period string like 'YYYY-MM-DD'
                    // Build UTC day-range to avoid local timezone shifts (append 'Z')
                    const from = `${p.x}T00:00:00.000Z`;
                    const to = `${p.x}T23:59:59.999Z`;
                    const resp = await getDashboardDrilldown(
                      "in",
                      1,
                      20,
                      undefined,
                      from,
                      to,
                    );
                    if (resp.data) setDrilldownData(resp.data);
                    setDrilldownLoading(false);
                  }}
                />
              </Col>
              <Col xs={24} lg={12}>
                <h3 className="m-0">Out (Usage)</h3>
                <Sparkline
                  points={(trendsOut || []).map((r) => ({
                    x: r.period,
                    y: Number(r.total_quantity) || 0,
                  }))}
                  onPointClick={async (_i, p) => {
                    setDrilldownVisible(true);
                    setDrilldownLoading(true);
                    // Build UTC day-range to avoid local timezone shifts (append 'Z')
                    const from = `${p.x}T00:00:00.000Z`;
                    const to = `${p.x}T23:59:59.999Z`;
                    const resp = await getDashboardDrilldown(
                      "out",
                      1,
                      20,
                      undefined,
                      from,
                      to,
                    );
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
                { title: "Material", dataIndex: "material_id" },
                { title: "Lot", dataIndex: "lot_id" },
                {
                  title: "Quantity",
                  dataIndex: "quantity",
                  render: (value: number) => (
                    <Tag color={isLowStock(value) ? "red" : "green"}>
                      {value}
                    </Tag>
                  ),
                },
                { title: "Status", dataIndex: "status" },
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
                    { title: "Supplier", dataIndex: "supplier_name" },
                    { title: "Approved", dataIndex: "approved" },
                    { title: "Rejected", dataIndex: "rejected" },
                    {
                      title: "Quality Rate",
                      dataIndex: "quality_rate",
                      render: (value: number) =>
                        `${Number(value || 0).toFixed(2)}%`,
                    },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title="Recent Audit Events">
                <Table
                  rowKey={(record) =>
                    `${record.entity}-${record.performed_at}-${record.action}`
                  }
                  pagination={{ pageSize: 6 }}
                  dataSource={(auditReport?.entries || []).slice(0, 20)}
                  columns={[
                    { title: "Action", dataIndex: "action" },
                    { title: "Entity", dataIndex: "entity" },
                    { title: "By", dataIndex: "performed_by" },
                    { title: "At", dataIndex: "performed_at" },
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          <p className="text-xs text-gray-400 m-0">
            Last sync:{" "}
            {inventoryStatus?.generated_at ||
              materialUsage?.generated_at ||
              qcPerformance?.generated_at ||
              auditReport?.generated_at ||
              "N/A"}
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
                { title: "Transaction ID", dataIndex: "transaction_id" },
                { title: "Lot", dataIndex: "lot_id" },
                { title: "Type", dataIndex: "transaction_type" },
                { title: "Quantity", dataIndex: "quantity" },
                { title: "Date", dataIndex: "transaction_date" },
              ]}
            />
          </Modal>
        </>
      )}
    </div>
  );
}
