/**
 * InventoryAudit Page (Operator)
 * Trang kiểm kê tồn kho (Inventory Audit) dành cho Operator
 * 
 * Chức năng chính:
 * - Hiển thị danh sách tất cả lô hàng (Inventory Lots) trong kho
 * - Cho phép Operator nhập số lượng thực tế đếm được tại kho (Counted Qty)
 * - So sánh số lượng hệ thống vs số lượng thực tế để tìm chênh lệch (Discrepancy)
 * - Tự động tạo giao dịch điều chỉnh (Adjustment Transaction) khi có chênh lệch
 * 
 * Quy trình kiểm kê:
 * 1. Operator đếm số lượng thực tế từng lô hàng tại kho
 * 2. Nhập số lượng đếm được vào cột "Counted Qty"
 * 3. Hệ thống tự động tính Delta (chênh lệch)
 * 4. Nhấn "Apply Audit Adjustments" để cập nhật số liệu hệ thống
 * 5. Tạo giao dịch Receipt (thừa) hoặc Usage (thiếu) tương ứng
 * 
 * Lưu ý: Chỉ những lô có chênh lệch mới được tạo giao dịch điều chỉnh
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  InputNumber,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { fetchInventoryLots } from '../../services/inventoryLotService';
import { InventoryLotAPI } from '../../services/inventory-lot.service';
import { transactionService } from '../../services/transactionService';
import type { InventoryLot } from '../../types/inventory';

// Kiểu dữ liệu cho dòng kiểm kê: kế thừa từ InventoryLot + thêm số lượng đếm được
type AuditRow = InventoryLot & {
  countedQuantity?: number;  // Số lượng thực tế đếm được
};

export default function InventoryAuditOperator() {
  // State loading khi tải dữ liệu
  const [loading, setLoading] = useState(true);
  // State loading khi đang áp dụng điều chỉnh
  const [saving, setSaving] = useState(false);
  // State lưu thông báo lỗi
  const [error, setError] = useState<string | null>(null);
  // State lưu danh sách các lô cần kiểm kê
  const [rows, setRows] = useState<AuditRow[]>([]);

  // Tải danh sách lô hàng khi component mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const lots = await fetchInventoryLots();
        // Khởi tạo: số lượng đếm được mặc định = số lượng hệ thống
        setRows(lots.map((lot) => ({ ...lot, countedQuantity: Number(lot.quantity) })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách lô hàng');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  // Tính toán các lô có chênh lệch (discrepancies) - sử dụng useMemo để tối ưu
  const discrepancies = useMemo(
    () =>
      rows.filter((row) => {
        const systemQty = Number(row.quantity);  // Số lượng hệ thống
        const countedQty = Number(row.countedQuantity ?? row.quantity);  // Số lượng đếm được
        // So sánh với độ chính xác 6 chữ số thập phân
        return Number((countedQty - systemQty).toFixed(6)) !== 0;
      }),
    [rows],
  );

  // Xử lý khi Operator thay đổi số lượng đếm được
  const handleCountChange = (lotId: string, value: number | null) => {
    setRows((prev) =>
      prev.map((row) =>
        row.lot_id === lotId
          ? { ...row, countedQuantity: value ?? 0 }
          : row,
      ),
    );
  };

  // Áp dụng các điều chỉnh chênh lệch vào hệ thống
  const applyAdjustments = async () => {
    if (discrepancies.length === 0) {
      message.info('Không có chênh lệch nào được phát hiện');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Duyệt qua từng lô có chênh lệch để xử lý
      for (const row of discrepancies) {
        const systemQty = Number(row.quantity);
        const countedQty = Number(row.countedQuantity ?? row.quantity);
        const delta = Number((countedQty - systemQty).toFixed(6));  // Chênh lệch

        // Cập nhật số lượng lô hàng trong hệ thống
        await InventoryLotAPI.update(row.lot_id, {
          quantity: countedQty,
          // Nếu số lượng = 0 thì chuyển trạng thái thành Depleted
          status: countedQty === 0 ? 'Depleted' : row.status,
          notes: `Kiểm kê điều chỉnh: ${systemQty} -> ${countedQty}`,
        });

        // Tạo giao dịch kho tương ứng
        await transactionService.createTransaction({
          lot_id: row.lot_id,
          material_id: row.material_id,
          // Nếu thừa (+delta) -> Receipt, nếu thiếu (-delta) -> Usage
          transaction_type: delta > 0 ? 'Receipt' : 'Usage',
          quantity: Math.abs(delta),  // Lấy giá trị tuyệt đối
          unit_of_measure: row.unit_of_measure,
          transaction_date: new Date().toISOString(),
          reference_number: 'KIEM-KE-DIEU-CHINH',
          performed_by: 'operator-audit',
          notes: `Kiểm kê điều chỉnh từ ${systemQty} đến ${countedQty}`,
        });
      }

      // Cập nhật lại state với số lượng mới
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          quantity: Number(row.countedQuantity ?? row.quantity),
        })),
      );

      message.success(`Đã áp dụng ${discrepancies.length} điều chỉnh tồn kho`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể áp dụng điều chỉnh kiểm kê';
      setError(msg);
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kiểm Kê Tồn Kho</h1>
        <p className="text-sm text-gray-500">Đếm số lượng thực tế tại kho và ghi nhận điều chỉnh</p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card>
        {loading ? (
          <div className="py-12 text-center">
            <Spin />
          </div>
        ) : (
          <>
            <Table
              rowKey="lot_id"
              dataSource={rows}
              pagination={{ pageSize: 10 }}
              columns={[
                { title: 'Mã Lô', dataIndex: 'lot_id' },
                { title: 'Vật Tư', dataIndex: 'material_id' },
                {
                  title: 'SL Hệ Thống',
                  dataIndex: 'quantity',
                  render: (value: number) => Number(value).toFixed(3),
                },
                {
                  title: 'SL Đếm Được',
                  key: 'countedQuantity',
                  render: (_: unknown, record: AuditRow) => (
                    <InputNumber
                      min={0}
                      step={0.001}
                      value={record.countedQuantity}
                      onChange={(value) => handleCountChange(record.lot_id, value)}
                    />
                  ),
                },
                {
                  title: 'Chênh Lệch',
                  key: 'delta',
                  render: (_: unknown, record: AuditRow) => {
                    const delta = Number((Number(record.countedQuantity ?? 0) - Number(record.quantity)).toFixed(3));
                    return (
                      <Tag color={delta === 0 ? 'green' : delta > 0 ? 'blue' : 'red'}>
                        {delta > 0 ? `+${delta}` : delta}
                      </Tag>
                    );
                  },
                },
              ]}
            />

            <Space style={{ marginTop: 12 }}>
              <Typography.Text>
                Số lô chênh lệch: <strong>{discrepancies.length}</strong>
              </Typography.Text>
              <Button type="primary" loading={saving} onClick={() => void applyAdjustments()}>
                Áp Dụng Điều Chỉnh
              </Button>
            </Space>
          </>
        )}
      </Card>
    </div>
  );
}
