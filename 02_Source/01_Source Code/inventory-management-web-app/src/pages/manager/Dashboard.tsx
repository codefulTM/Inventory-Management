/**
 * Manager Dashboard
 * Dashboard dành cho Manager (Quản lý)
 * Hiển thị: KPI tồn kho, xu hướng nhập/xuất, nguyên liệu sử dụng, chất lượng QC
 * Hỗ trợ lọc theo: khoảng thời gian, chu kỳ (ngày/tuần/tháng), kho hàng
 * Có chức năng drilldown (xem chi tiết giao dịch khi click vào điểm trên biểu đồ)
 * Xuất CSV cho báo cáo
 */

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

/**
 * Kiểm tra xem số lượng có dưới ngưỡng "sắp hết hàng" không
 * Ngưỡng: <= 100 được coi là low stock
 */
function isLowStock(quantity: number): boolean {
  return quantity <= 100;
}

/**
 * Bảng ánh xạ mã action audit sang tiếng Việt
 */
const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Đăng nhập thành công",
  LOGIN_FAILED: "Đăng nhập thất bại",
  LOGOUT_SUCCESS: "Đăng xuất",
  LOGOUT_FAILED: "Đăng xuất thất bại",
  USER_CREATED: "Tạo tài khoản",
  USER_UPDATED: "Cập nhật tài khoản",
  USER_LOCKED: "Khóa tài khoản",
  USER_UNLOCKED: "Mở khóa tài khoản",
  PASSWORD_RESET_REQUESTED: "Yêu cầu đặt lại mật khẩu",
  PASSWORD_RESET_COMPLETED: "Đặt lại mật khẩu thành công",
  INVENTORY_LOT_UPDATED: "Cập nhật lô hàng",
};

/**
 * Chuẩn hóa report data - xử lý trường hợp backend trả về { data: { ... } }
 * Nếu report không có các field trực tiếp mà nằm trong "data", unwrap nó ra
 */
function normalizeReport<T extends object>(raw: T | null): T | null {
  if (!raw) return null;
  // Handle backend wrapping { data: { ... } }
  if (
    "data" in (raw as any) &&
    !(raw as any).generated_at &&
    !(raw as any).items &&
    !(raw as any).entries &&
    !(raw as any).points
  ) {
    return (raw as any).data as T;
  }
  return raw;
}

/**
 * Chuyển Date object thành string định dạng YYYY-MM-DD (UTC)
 */
function toDateInput(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Chuyển đổi date string (YYYY-MM-DD) thành ISO range
 * from: bắt đầu ngày (00:00:00.000Z)
 * to: kết thúc ngày (23:59:59.999Z)
 */
function toRangeIso(
  fromInput: string | undefined | null,
  toInput: string | undefined | null,
): { from: string | undefined; to: string | undefined } {
  const from = fromInput
    ? new Date(`${fromInput}T00:00:00.000Z`).toISOString()
    : undefined;
  const to = toInput
    ? new Date(`${toInput}T23:59:59.999Z`).toISOString()
    : undefined;
  return { from, to };
}

/**
 * MiniLineChart - Component vẽ biểu đồ đường đơn giản bằng SVG
 * Dùng để hiển thị xu hướng trong các card nhỏ
 */
function MiniLineChart({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) {
    return <div className="text-xs text-gray-500">Không có dữ liệu</div>;
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

/**
 * downloadCsv - Tải dữ liệu dưới dạng file CSV
 * @param filename - Tên file tải về
 * @param rows - Mảng object, mỗi object là một dòng
 */
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

/**
 * DashboardManager - Trang dashboard chính của Manager
 * Hiển thị: 4 KPI cards, biểu đồ nhập/xuất, 4 mini trend charts,
 * bảng top nguyên liệu, bảng xếp hạng nhà cung cấp, bảng lô sắp hết
 * Hỗ trợ drilldown vào chi tiết giao dịch từ sparkline
 */
export default function DashboardManager() {
  // State cho bộ lọc
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [interval, setInterval] = useState<TrendInterval>("month");
  const [refreshToken, setRefreshToken] = useState(0);

  // State bổ sung từ frontend dashboard
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

  // State cho dữ liệu báo cáo
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

  // ===== TẢI DỮ LIỆU BÁO CÁO =====
  // Chạy lại khi filter thay đổi: fromDate, toDate, interval, filterWarehouse
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const range = toRangeIso(fromDate, toDate);
        // Gọi song song 8 API: 4 báo cáo + 4 trend
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
          getInventoryStatusReport(range.from, range.to, filterWarehouse),
          getMaterialUsageReport(range.from, range.to, filterWarehouse),
          getQcPerformanceReport(range.from, range.to, filterWarehouse),
          getAuditReport(range.from, range.to, filterWarehouse),
          getInventoryTrendReport(
            range.from,
            range.to,
            interval,
            filterWarehouse,
          ),
          getMaterialUsageTrendReport(
            range.from,
            range.to,
            interval,
            8,
            filterWarehouse,
          ),
          getQcTrendReport(range.from, range.to, interval, 8, filterWarehouse),
          getAuditTrendReport(range.from, range.to, interval, filterWarehouse),
        ]);

        setInventoryStatus(normalizeReport(inventory));
        setMaterialUsage(normalizeReport(usage));
        setQcPerformance(normalizeReport(qc));
        setAuditReport(normalizeReport(audit));
        setInventoryTrend(normalizeReport(inventoryTrendData));
        setMaterialTrend(normalizeReport(materialTrendData));
        setQcTrend(normalizeReport(qcTrendData));
        setAuditTrend(normalizeReport(auditTrendData));
        console.log("Dashboard main data loaded", {
          inventoryStatus,
          materialUsage,
          qcPerformance,
          auditReport,
          inventoryTrend,
          materialTrend,
          qcTrend,
          auditTrend,
        });
        // Tải bổ sung: summary, trends, warehouses (không chặn nếu lỗi)
        void (async () => {
          try {
            const [dashSum, inT, outT, whs] = await Promise.all([
              getDashboardSummary(filterWarehouse, range.from, range.to),
              getDashboardTrends(
                "in",
                range.from,
                range.to,
                interval,
                filterWarehouse,
              ),
              getDashboardTrends(
                "out",
                range.from,
                range.to,
                interval,
                filterWarehouse,
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
        // Print full stack trace when available
        console.error(err instanceof Error ? err.stack : err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fromDate, toDate, interval, refreshToken, filterWarehouse]);

  // mountedRef: tránh auto-apply filter khi đang wiring RangePicker
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  // Đồng bộ fromDate/toDate khi user chọn khoảng thời gian mới
  useEffect(() => {
    if (!dateRange) {
      setFromDate(null);
      setToDate(null);
      return;
    }

    if (!dateRange[0]) setFromDate(null);
    else setFromDate(toDateInput(new Date(dateRange[0].toISOString())));
    if (!dateRange[1]) setToDate(null);
    else setToDate(toDateInput(new Date(dateRange[1].toISOString())));
    // only depend on dateRange
  }, [dateRange]);

  // Auto-apply filters khi user thay đổi khoảng thời gian/kho/chu kỳ
  // (Hiện tại đang bị comment out - để lại để tham khảo)
  // useEffect(() => {
  //   if (!mountedRef.current) return;
  //   void applyRangeAndWarehouse();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [dateRange, filterWarehouse, interval]);

  /**
   * Format ngày giờ ngắn gọn
   */
  function formatDateShort(iso?: string): string {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear() % 100).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${dd}-${mm}-${yy}, ${hours}:${mins}`;
  }

  /**
   * Tự động tính chu kỳ phù hợp dựa trên khoảng thời gian
   * > 180 ngày -> month, > 30 ngày -> week, còn lại -> day
   */
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

  /**
   * Áp dụng bộ lọc: tải lại summary, trends, trigger refresh báo cáo
   */
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
      // Print full stack trace when available
      console.error(err instanceof Error ? err.stack : err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh dashboard",
      );
    } finally {
      setLoading(false);
    }
  }

  // ===== DỮ LIỆU TÍNH TOÁN (useMemo) =====

  // Danh sách lô sắp hết hàng (low stock)
  const lowStockItems = useMemo(
    () =>
      (inventoryStatus?.items || []).filter((item) =>
        isLowStock(item.quantity),
      ),
    [inventoryStatus],
  );

  // Tổng số lượng nguyên liệu đã sử dụng
  const totalUsageQuantity = useMemo(
    () =>
      (materialUsage?.items || []).reduce(
        (sum, item) => sum + (Number(item.total_quantity) || 0),
        0,
      ),
    [materialUsage],
  );

  // Tỷ lệ QC đạt trung bình
  const averageQcRate = useMemo(() => {
    const items = qcPerformance?.items || [];
    if (items.length === 0) return 0;
    const total = items.reduce(
      (sum, item) => sum + (Number(item.quality_rate) || 0),
      0,
    );
    return Number((total / items.length).toFixed(2));
  }, [qcPerformance]);

  // Top 8 nguyên liệu sử dụng nhiều nhất (tổng hợp từ trend data)
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

  // ===== SERIES DỮ LIỆU CHO BIỂU ĐỒ =====
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
    <PageWrapper className="space-y-4">
      {/* <div className="p-6 space-y-6"> */}
      <div className="animate-fadeInUp">
        <h1 className="text-2xl font-bold text-gray-900">Bảng Điều Khiển</h1>
        <p className="text-sm text-gray-500 mt-1">
          Phân tích xu hướng, KPI báo cáo và tín hiệu vận hành.
        </p>
      </div>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Card
        title="Bộ Lọc Phân Tích"
        className="hover:shadow-md transition-shadow duration-200"
      >
        <div className="mb-2">
          <Button
            type="default"
            className="w-20"
            onClick={() => {
              setDateRange(null);
              setFilterWarehouse(undefined);
              setInterval("month");
            }}
          >
            Đặt lại
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs font-semibold text-gray-600">
            Khoảng thời gian (Từ — Đến)
            <div className="mt-1">
              <DatePicker.RangePicker
                value={dateRange as any}
                onChange={(dates: any) => setDateRange(dates)}
                style={{ width: "100%" }}
              />
            </div>
          </label>

          <label className="text-xs font-semibold text-gray-600">
            Chu kỳ
            <div className="mt-1">
              <Select
                value={interval}
                onChange={(v) => setInterval(v as TrendInterval)}
                options={[
                  { label: "Ngày", value: "day" },
                  { label: "Tuần", value: "week" },
                  { label: "Tháng", value: "month" },
                ]}
                style={{ width: "100%" }}
              />
            </div>
          </label>

          <label className="text-xs font-semibold text-gray-600">
            Kho hàng
            <div className="mt-1">
              <Select
                allowClear
                placeholder="Kho hàng"
                value={filterWarehouse}
                onChange={(v) => setFilterWarehouse(v)}
                options={(warehouses || []).map((w) => ({
                  label: w.warehouse_name || w.warehouse_id,
                  value: w.warehouse_id,
                }))}
                style={{ width: "100%" }}
                className="mt-1"
              />
            </div>
          </label>
        </div>
      </Card>
      <div></div>
      <StatsGrid cols={4}>
        <div className="stagger-item" style={{ animationDelay: "0ms" }}>
          <StatCard
            label="Tổng số lô hàng"
            value={inventoryStatus?.total_lots || 0}
            icon={<Package className="w-5 h-5" />}
          />
        </div>
        <div className="stagger-item" style={{ animationDelay: "50ms" }}>
          <StatCard
            label="Lô sắp hết hàng"
            value={lowStockItems.length}
            icon={<AlertTriangle className="w-5 h-5" />}
            variant={lowStockItems.length > 0 ? "error" : "success"}
          />
        </div>
        <div className="stagger-item" style={{ animationDelay: "100ms" }}>
          <StatCard
            label="Tổng sử dụng nguyên liệu"
            value={totalUsageQuantity}
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </div>
        <div className="stagger-item" style={{ animationDelay: "150ms" }}>
          <StatCard
            label="Tỷ lệ QC đạt TB"
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
            <h3 className="m-0">Nhập kho</h3>
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
            <h3 className="m-0">Xuất kho</h3>
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
      <div></div>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12} xl={6}>
          <Card title="Xu hướng tồn kho">
            <MiniLineChart data={inventoryTrendSeries} color="#0f766e" />
          </Card>
        </Col>
        <Col xs={24} lg={12} xl={6}>
          <Card title="Xu hướng sử dụng nguyên liệu">
            <MiniLineChart data={usageTrendSeries} color="#b45309" />
          </Card>
        </Col>
        <Col xs={24} lg={12} xl={6}>
          <Card title="Xu hướng QC đạt">
            <MiniLineChart data={qcTrendSeries} color="#2563eb" />
          </Card>
        </Col>
        <Col xs={24} lg={12} xl={6}>
          <Card title="Xu hướng hoạt động hệ thống">
            <MiniLineChart data={auditTrendSeries} color="#7c3aed" />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title="Top Nguyên Liệu Sử Dụng"
            extra={
              <Button
                icon={<Download className="w-4 h-4" />}
                onClick={() =>
                  downloadCsv("top-material-usage.csv", topMaterials)
                }
              >
                Xuất CSV
              </Button>
            }
          >
            <Table
              rowKey="material_id"
              pagination={{ pageSize: 8 }}
              dataSource={topMaterials}
              columns={[
                { title: "Nguyên liệu", dataIndex: "material_id" },
                { title: "Giao dịch", dataIndex: "transaction_count" },
                { title: "Tổng số lượng", dataIndex: "total_quantity" },
              ]}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card
            title="Xếp Hạng Chất Lượng Nhà Cung Cấp"
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
                Xuất CSV
              </Button>
            }
          >
            <Table
              rowKey="supplier_name"
              pagination={{ pageSize: 8 }}
              dataSource={qcTrend?.supplier_rankings || []}
              columns={[
                { title: "Nhà cung cấp", dataIndex: "supplier_name" },
                { title: "Đạt", dataIndex: "pass_count" },
                { title: "Không đạt", dataIndex: "fail_count" },
                {
                  title: "Tỷ lệ đạt",
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
        title="Danh Sách Lô Sắp Hết Hàng"
        className="hover:shadow-md transition-shadow duration-200"
      >
        <Table
          rowKey="lot_id"
          pagination={{ pageSize: 8 }}
          dataSource={lowStockItems}
          columns={[
            { title: "Nguyên liệu", dataIndex: "material_id" },
            { title: "Lô hàng", dataIndex: "lot_id" },
            {
              title: "Số lượng",
              dataIndex: "quantity",
              render: (value: number) => (
                <Tag color={isLowStock(value) ? "red" : "green"}>{value}</Tag>
              ),
            },
            { title: "Trạng thái", dataIndex: "status" },
          ]}
          size="middle"
        />
      </Card>
      <Modal
        title="Chi Tiết Giao Dịch"
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
            { title: "Mã giao dịch", dataIndex: "transaction_id" },
            { title: "Lô hàng", dataIndex: "lot_id" },
            { title: "Loại", dataIndex: "transaction_type" },
            { title: "Số lượng", dataIndex: "quantity" },
            { title: "Ngày", dataIndex: "transaction_date" },
          ]}
        />
      </Modal>
      <Divider />
      <p className="text-xs text-gray-400 m-0">
        Cập nhật lúc: {new Date().toLocaleString("vi-VN")} | Chu kỳ:{" "}
        {interval === "day" ? "Ngày" : interval === "week" ? "Tuần" : "Tháng"}
      </p>
      {/* </div> */}
    </PageWrapper>
  );
}
