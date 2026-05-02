/**
 * SystemReports - Trang báo cáo hệ thống dành cho IT Administrator
 * 
 * Chức năng chính:
 * - Hiển thị báo cáo tổng hợp từ nhiều nguồn: Inventory, QC, Audit
 * - Bảng "Inventory Health": Tổng số lô hàng, số lô đã cạn kiệt (Depleted)
 * - Bảng "Quality & Audit": Tỷ lệ QC pass rate, số lượng audit entries
 * - Dữ liệu được lấy song song từ 3 API: Inventory Status, QC Performance, Audit Report
 * 
 * Quyền truy cập: Chỉ IT Administrator (/admin/*)
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Row, Table } from 'antd';
import { getAuditReport, getInventoryStatusReport, getQcPerformanceReport } from '../../services/reportsService';

// Kiểu dữ liệu cho một dòng trong bảng báo cáo
type ReportRow = {
  name: string;        // Tên chỉ số (metric)
  value: number | string; // Giá trị tương ứng
};

export default function SystemReports() {
  // State lưu thông báo lỗi
  const [error, setError] = useState<string | null>(null);
  // Tổng số lô hàng trong kho
  const [inventoryTotal, setInventoryTotal] = useState(0);
  // Số lượng lô đã cạn kiệt (Depleted)
  const [depleted, setDepleted] = useState(0);
  // Tỷ lệ QC pass rate (%)
  const [qcPassRate, setQcPassRate] = useState<number | null>(null);
  // Số lượng bản ghi audit
  const [auditEntries, setAuditEntries] = useState(0);

  // useEffect: Tự động tải dữ liệu báo cáo khi component mount
  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        // Gọi song song 3 API để tối ưu tốc độ tải
        const [inventory, qc, audit] = await Promise.all([
          getInventoryStatusReport(),    // Báo cáo tồn kho
          getQcPerformanceReport(),     // Báo cáo hiệu suất QC
          getAuditReport(),             // Báo cáo audit
        ]);
        setInventoryTotal(inventory.total_lots);
        // Đếm số lô có trạng thái "Depleted" (đã cạn kiệt)
        setDepleted(
          inventory.items.filter((item) => item.status === 'Depleted').length,
        );
        // Tính tỷ lệ pass rate của QC: (approved / total) * 100
        const totalApproved = qc.items.reduce((sum, item) => sum + item.approved, 0);
        const totalRejected = qc.items.reduce((sum, item) => sum + item.rejected, 0);
        const totalQc = totalApproved + totalRejected;
        setQcPassRate(totalQc > 0 ? Number(((totalApproved / totalQc) * 100).toFixed(2)) : null);
        // Số lượng bản ghi audit
        setAuditEntries(audit.entries.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      }
    };

    void load();
  }, []);

  // useMemo: Tạo mảng dữ liệu cho bảng báo cáo (chỉ tính lại khi các dependency thay đổi)
  const summaryRows = useMemo<ReportRow[]>(
    () => [
      { name: 'Total Inventory Lots', value: inventoryTotal },       // Tổng số lô hàng
      { name: 'Depleted Lots', value: depleted },                    // Số lô đã cạn kiệt
      { name: 'QC Pass Rate', value: qcPassRate == null ? 'N/A' : `${qcPassRate}%` }, // Tỷ lệ QC đạt
      { name: 'Audit Entries', value: auditEntries },                // Số bản ghi audit
    ],
    [auditEntries, depleted, inventoryTotal, qcPassRate]
  );

  return (
    <div className="p-6 space-y-4">
      {/* Tiêu đề trang báo cáo hệ thống */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Reports</h1>
        <p className="text-sm text-gray-500">Báo cáo tổng hợp vận hành hệ thống dành cho IT Administrator</p>
      </div>

      {/* Hiển thị lỗi nếu có */}
      {error ? <Alert type="error" showIcon message={error} /> : null}

      {/* Grid 2 cột hiển thị báo cáo */}
      <Row gutter={[16, 16]}>
        {/* Cột trái: Báo cáo tồn kho (Inventory Health) */}
        <Col xs={24} md={12}>
          <Card title="Inventory Health (Sức khỏe tồn kho)">
            <Table
              rowKey="name"
              size="small"
              pagination={false}
              // Lọc ra các chỉ số liên quan đến Inventory và Depleted
              dataSource={summaryRows.filter((row) => /Inventory|Depleted/.test(row.name))}
              columns={[
                { title: 'Chỉ số', dataIndex: 'name' },
                { title: 'Giá trị', dataIndex: 'value' },
              ]}
            />
          </Card>
        </Col>
        {/* Cột phải: Báo cáo QC và Audit */}
        <Col xs={24} md={12}>
          <Card title="Quality & Audit (Chất lượng & Kiểm toán)">
            <Table
              rowKey="name"
              size="small"
              pagination={false}
              // Lọc ra các chỉ số liên quan đến QC và Audit
              dataSource={summaryRows.filter((row) => /QC|Audit/.test(row.name))}
              columns={[
                { title: 'Chỉ số', dataIndex: 'name' },
                { title: 'Giá trị', dataIndex: 'value' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
