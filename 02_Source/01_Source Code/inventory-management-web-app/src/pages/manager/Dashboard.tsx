// === Dashboard.tsx ===
// Dashboard dành cho Manager - Hiển thị KPI tồn kho, xu hướng, chất lượng QC
// Features: filter by date/warehouse/interval, drilldown, export CSV, Sparkline charts
// Methods: load data, compute trends, downloadCsv
// API/Dependencies: getInventoryStatusReport, getMaterialUsageReport, getQcPerformanceReport, getAuditReport, getDashboardSummary