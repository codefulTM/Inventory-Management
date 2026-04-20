import { useEffect, useMemo, useState, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  Table,
  Tag,
} from "antd";
import {
  AlertTriangle,
  Download,
  Package,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  getAuditReport,
  getAuditTrendReport,
  getInventoryStatusReport,
  getInventoryTrendReport,
  getMaterialUsageReport,
  getMaterialUsageTrendReport,
  getQcPerformanceReport,
  getQcTrendReport,
} from "../../services/reportsService";
import type {
  AuditReport,
  AuditTrendReport,
  InventoryStatusReport,
  InventoryTrendReport,
  MaterialUsageReport,
  MaterialUsageTrendReport,
  QcPerformanceReport,
  QcTrendReport,
  TrendInterval,
} from "../../types/reports";
import {
  LoadingSkeleton,
  PageWrapper,
  StatCard,
  StatsGrid,
} from "../../components/ui";
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

function toDateInput(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toRangeIso(
  fromInput: string,
  toInput: string,
): { from: string; to: string } {
  const from = new Date(`${fromInput}T00:00:00.000Z`).toISOString();
  const to = new Date(`${toInput}T23:59:59.999Z`).toISOString();
  return { from, to };
}

function MiniLineChart({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) {
    return <div className="text-xs text-gray-500">No data</div>;
  }

  const width = 280;
  const height = 88;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 1);
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data
    .map((value, index) => {
      const x = Math.round(index * step);
      const y = Math.round(height - ((value - min) / range) * height);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

function downloadCsv(
  filename: string,
  rows: Record<string, string | number>[],
) {
  if (rows.length === 0) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const raw = String(row[header] ?? "");
      return `"${raw.replace(/"/g, '""')}"`;
    });
    lines.push(values.join(","));
  }

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function DashboardManager() {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);

  const [fromDate, setFromDate] = useState<string>(toDateInput(defaultFrom));
  const [toDate, setToDate] = useState<string>(toDateInput(now));
  const [interval, setInterval] = useState<TrendInterval>("day");
  const [refreshToken, setRefreshToken] = useState(0);

  // Additional UI + state from frontend dashboard
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState<string | undefined>(
    undefined,
  );
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [_summary, setSummary] = useState<any>(null);
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
    limit: 20,
  });
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inventoryStatus, setInventoryStatus] =
    useState<InventoryStatusReport | null>(null);
  const [materialUsage, setMaterialUsage] =
    useState<MaterialUsageReport | null>(null);
  const [qcPerformance, setQcPerformance] =
    useState<QcPerformanceReport | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);

  const [inventoryTrend, setInventoryTrend] =
    useState<InventoryTrendReport | null>(null);
  const [materialTrend, setMaterialTrend] =
    useState<MaterialUsageTrendReport | null>(null);
  const [qcTrend, setQcTrend] = useState<QcTrendReport | null>(null);
  const [auditTrend, setAuditTrend] = useState<AuditTrendReport | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const range = toRangeIso(fromDate, toDate);
        const [
          inventory,
          usage,
          qc,
          audit,
          inventoryTrendData,
          materialTrendData,
          qcTrendData,
          auditTrendData,
        ] = await Promise.all([
          getInventoryStatusReport(),
          getMaterialUsageReport(range.from, range.to),
          getQcPerformanceReport(),
          getAuditReport(),
          getInventoryTrendReport(range.from, range.to, interval),
          getMaterialUsageTrendReport(range.from, range.to, interval, 8),
          getQcTrendReport(range.from, range.to, interval, 8),
          getAuditTrendReport(range.from, range.to, interval),
        ]);

        setInventoryStatus(inventory);
        setMaterialUsage(usage);
        setQcPerformance(qc);
        setAuditReport(audit);
        setInventoryTrend(inventoryTrendData);
        setMaterialTrend(materialTrendData);
        setQcTrend(qcTrendData);
        setAuditTrend(auditTrendData);
        // Try to load condensed dashboard summary/trends and warehouses (non-blocking)
        void (async () => {
          try {
            const [dashSum, inT, outT, whs] = await Promise.all([
              getDashboardSummary(undefined, range.from, range.to),
              getDashboardTrends(
                "in",
                range.from,
                range.to,
                interval,
                undefined,
              ),
              getDashboardTrends(
                "out",
                range.from,
                range.to,
                interval,
                undefined,
              ),
              fetchWarehouses(1, 200),
            ]);
            if (dashSum?.data) setSummary(dashSum.data);
            if (inT?.data) setTrendsIn(inT.data);
            if (outT?.data) setTrendsOut(outT.data);
            setWarehouses((whs && (whs.data || [])) || []);
          } catch (err) {
            // swallow non-fatal dashboard extras
            // eslint-disable-next-line no-console
            console.debug("dashboard extras load failed", err);
          }
        })();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fromDate, toDate, interval, refreshToken]);

  // mountedRef prevents accidental auto-apply when wiring RangePicker
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  function computeInterval(fromIso?: string, toIso?: string): TrendInterval {
    if (!fromIso || !toIso) return "day";
    const fromMs = new Date(fromIso).getTime();
    const toMs = new Date(toIso).getTime();
    if (isNaN(fromMs) || isNaN(toMs) || toMs <= fromMs) return "day";
    const days = Math.ceil((toMs - fromMs) / (1000 * 60 * 60 * 24));
    if (days > 180) return "month";
    if (days > 30) return "week";
    return "day";
  }

  async function applyRangeAndWarehouse() {
    const now = new Date();
    const defaultFrom = new Date(
      now.getTime() - 7 * 24 * 3600 * 1000,
    ).toISOString();
    const defaultTo = now.toISOString();

    const from = dateRange?.[0] ? dateRange[0].toISOString() : defaultFrom;
    const to = dateRange?.[1] ? dateRange[1].toISOString() : defaultTo;
    const intervalCalc = computeInterval(from, to);
    setInterval(intervalCalc);

    try {
      setLoading(true);
      const sumResp = await getDashboardSummary(filterWarehouse, from, to);
      if (sumResp.data) setSummary(sumResp.data);
      const inResp = await getDashboardTrends(
        "in",
        from,
        to,
        intervalCalc,
        filterWarehouse,
      );
      const outResp = await getDashboardTrends(
        "out",
        from,
        to,
        intervalCalc,
        filterWarehouse,
      );
      if (inResp.data) setTrendsIn(inResp.data);
      if (outResp.data) setTrendsOut(outResp.data);
      // Trigger broader dashboard refresh (inventory/material/qc/audit) as well
      setFromDate(toDateInput(new Date(from)));
      setToDate(toDateInput(new Date(to)));
      setRefreshToken((v) => v + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh dashboard",
      );
    } finally {
      setLoading(false);
    }
  }

  const lowStockItems = useMemo(
    () =>
      (inventoryStatus?.items || []).filter((item) =>
        isLowStock(item.quantity),
      ),
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
    const total = items.reduce(
      (sum, item) => sum + (Number(item.quality_rate) || 0),
      0,
    );
    return Number((total / items.length).toFixed(2));
  }, [qcPerformance]);

  const topMaterials = useMemo(() => {
    const aggregate = new Map<string, { quantity: number; count: number }>();
    for (const point of materialTrend?.points || []) {
      const current = aggregate.get(point.material_id) || {
        quantity: 0,
        count: 0,
      };
      aggregate.set(point.material_id, {
        quantity: current.quantity + Number(point.total_quantity || 0),
        count: current.count + Number(point.transaction_count || 0),
      });
    }

    return Array.from(aggregate.entries())
      .map(([material_id, value]) => ({
        material_id,
        total_quantity: Number(value.quantity.toFixed(2)),
        transaction_count: value.count,
      }))
      .sort((left, right) => right.total_quantity - left.total_quantity)
      .slice(0, 8);
  }, [materialTrend]);

  const inventoryTrendSeries = useMemo(
    () =>
      (inventoryTrend?.points || []).map((item) =>
        Number(item.total_quantity || 0),
      ),
    [inventoryTrend],
  );
  const qcTrendSeries = useMemo(
    () => (qcTrend?.points || []).map((item) => Number(item.pass_count || 0)),
    [qcTrend],
  );
  const auditTrendSeries = useMemo(
    () =>
      (auditTrend?.points || []).map((item) =>
        Number(item.activity_count || 0),
      ),
    [auditTrend],
  );
  const usageTrendSeries = useMemo(
    () =>
      (materialTrend?.points || []).map((item) =>
        Number(item.total_quantity || 0),
      ),
    [materialTrend],
  );

  if (loading) {
    return (
      <PageWrapper>
        <div className="p-6">
          <div className="mb-6">
            <LoadingSkeleton variant="text" className="w-48 h-8" />
            <LoadingSkeleton variant="text" className="w-72 h-4 mt-2" />
          </div>
          <StatsGrid cols={4}>
            <LoadingSkeleton variant="card" />
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
        <div className="animate-fadeInUp">
          <h1 className="text-2xl font-bold text-gray-900">
            Manager Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Analytics trends, report KPIs, and top operational signals.
          </p>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        <Card
          title="Analytics Filters"
          className="hover:shadow-md transition-shadow duration-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="text-xs font-semibold text-gray-600">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-gray-600">
              To
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-gray-600">
              Interval
              <select
                value={interval}
                onChange={(event) =>
                  setInterval(event.target.value as TrendInterval)
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="day">day</option>
                <option value="week">week</option>
                <option value="month">month</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button
                type="primary"
                className="w-full"
                onClick={() => setRefreshToken((value) => value + 1)}
              >
                Refresh Dashboard
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <DatePicker.RangePicker
                value={dateRange as any}
                onChange={(dates: any) => setDateRange(dates)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <Select
                allowClear
                placeholder="Warehouse"
                value={filterWarehouse}
                onChange={(v) => setFilterWarehouse(v)}
                options={(warehouses || []).map((w) => ({
                  label: w.warehouse_name || w.warehouse_id,
                  value: w.warehouse_id,
                }))}
                style={{ width: "100%" }}
              />
            </div>

            <div className="flex items-end">
              <Button
                type="default"
                className="w-full"
                onClick={() => {
                  setDateRange(null);
                  setFilterWarehouse(undefined);
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div />
            <div />
            <div className="flex justify-end">
              <Button
                type="primary"
                onClick={() => void applyRangeAndWarehouse()}
              >
                Apply
              </Button>
            </div>
          </div>
        </Card>

        <StatsGrid cols={4}>
          <div className="stagger-item" style={{ animationDelay: "0ms" }}>
            <StatCard
              label="Total Lots"
              value={inventoryStatus?.total_lots || 0}
              icon={<Package className="w-5 h-5" />}
            />
          </div>
          <div className="stagger-item" style={{ animationDelay: "50ms" }}>
            <StatCard
              label="Low-Stock Lots"
              value={lowStockItems.length}
              icon={<AlertTriangle className="w-5 h-5" />}
              variant={lowStockItems.length > 0 ? "error" : "success"}
            />
          </div>
          <div className="stagger-item" style={{ animationDelay: "100ms" }}>
            <StatCard
              label="Total Material Usage"
              value={totalUsageQuantity}
              icon={<TrendingUp className="w-5 h-5" />}
            />
          </div>
          <div className="stagger-item" style={{ animationDelay: "150ms" }}>
            <StatCard
              label="Average QC Pass Rate"
              value={`${averageQcRate}%`}
              icon={<ShieldCheck className="w-5 h-5" />}
              variant={
                averageQcRate >= 90
                  ? "success"
                  : averageQcRate >= 70
                    ? "warning"
                    : "error"
              }
            />
          </div>
        </StatsGrid>

        {/* In/Out trend sparklines with drilldown (merged from frontend) */}
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

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12} xl={6}>
            <Card title="Inventory Quantity Trend">
              <MiniLineChart data={inventoryTrendSeries} color="#0f766e" />
            </Card>
          </Col>
          <Col xs={24} lg={12} xl={6}>
            <Card title="Material Usage Trend">
              <MiniLineChart data={usageTrendSeries} color="#b45309" />
            </Card>
          </Col>
          <Col xs={24} lg={12} xl={6}>
            <Card title="QC Pass Trend">
              <MiniLineChart data={qcTrendSeries} color="#2563eb" />
            </Card>
          </Col>
          <Col xs={24} lg={12} xl={6}>
            <Card title="Audit Activity Trend">
              <MiniLineChart data={auditTrendSeries} color="#7c3aed" />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card
              title="Top Material Usage (Trend Aggregate)"
              extra={
                <Button
                  icon={<Download className="w-4 h-4" />}
                  onClick={() =>
                    downloadCsv("top-material-usage.csv", topMaterials)
                  }
                >
                  Export CSV
                </Button>
              }
            >
              <Table
                rowKey="material_id"
                pagination={{ pageSize: 8 }}
                dataSource={topMaterials}
                columns={[
                  { title: "Material", dataIndex: "material_id" },
                  { title: "Transactions", dataIndex: "transaction_count" },
                  { title: "Total Quantity", dataIndex: "total_quantity" },
                ]}
                size="middle"
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card
              title="Supplier Quality Ranking"
              extra={
                <Button
                  icon={<Download className="w-4 h-4" />}
                  onClick={() =>
                    downloadCsv(
                      "supplier-quality-ranking.csv",
                      qcTrend?.supplier_rankings || [],
                    )
                  }
                >
                  Export CSV
                </Button>
              }
            >
              <Table
                rowKey="supplier_name"
                pagination={{ pageSize: 8 }}
                dataSource={qcTrend?.supplier_rankings || []}
                columns={[
                  { title: "Supplier", dataIndex: "supplier_name" },
                  { title: "Pass", dataIndex: "pass_count" },
                  { title: "Fail", dataIndex: "fail_count" },
                  {
                    title: "Quality Rate",
                    dataIndex: "quality_rate",
                    render: (value: number) =>
                      `${Number(value || 0).toFixed(2)}%`,
                  },
                ]}
                size="middle"
              />
            </Card>
          </Col>
        </Row>

        <Card
          title="Low-Stock Watchlist"
          className="hover:shadow-md transition-shadow duration-200"
        >
          <Table
            rowKey="lot_id"
            pagination={{ pageSize: 8 }}
            dataSource={lowStockItems}
            columns={[
              { title: "Material", dataIndex: "material_id" },
              { title: "Lot", dataIndex: "lot_id" },
              {
                title: "Quantity",
                dataIndex: "quantity",
                render: (value: number) => (
                  <Tag color={isLowStock(value) ? "red" : "green"}>{value}</Tag>
                ),
              },
              { title: "Status", dataIndex: "status" },
            ]}
            size="middle"
          />
        </Card>

        <Card
          title="Recent Audit Events"
          className="hover:shadow-md transition-shadow duration-200"
        >
          <Table
            rowKey={(record) =>
              `${record.entity}-${record.performed_at}-${record.action}`
            }
            pagination={{ pageSize: 8 }}
            dataSource={(auditReport?.entries || []).slice(0, 40)}
            columns={[
              { title: "Action", dataIndex: "action" },
              { title: "Entity", dataIndex: "entity" },
              { title: "By", dataIndex: "performed_by" },
              { title: "At", dataIndex: "performed_at" },
            ]}
            size="middle"
          />
        </Card>

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

        <Divider />

        <p className="text-xs text-gray-400 m-0">
          Last refresh: {new Date().toISOString()} | Interval: {interval}
        </p>
      </div>
    </PageWrapper>
  );
}
