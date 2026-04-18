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

type AuditRow = InventoryLot & {
  countedQuantity?: number;
};

export default function InventoryAuditOperator() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const lots = await fetchInventoryLots();
        setRows(lots.map((lot) => ({ ...lot, countedQuantity: Number(lot.quantity) })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load inventory lots');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const discrepancies = useMemo(
    () =>
      rows.filter((row) => {
        const systemQty = Number(row.quantity);
        const countedQty = Number(row.countedQuantity ?? row.quantity);
        return Number((countedQty - systemQty).toFixed(6)) !== 0;
      }),
    [rows],
  );

  const handleCountChange = (lotId: string, value: number | null) => {
    setRows((prev) =>
      prev.map((row) =>
        row.lot_id === lotId
          ? { ...row, countedQuantity: value ?? 0 }
          : row,
      ),
    );
  };

  const applyAdjustments = async () => {
    if (discrepancies.length === 0) {
      message.info('No discrepancy detected');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      for (const row of discrepancies) {
        const systemQty = Number(row.quantity);
        const countedQty = Number(row.countedQuantity ?? row.quantity);
        const delta = Number((countedQty - systemQty).toFixed(6));

        await InventoryLotAPI.update(row.lot_id, {
          quantity: countedQty,
          status: countedQty === 0 ? 'Depleted' : row.status,
          notes: `Inventory audit adjustment: ${systemQty} -> ${countedQty}`,
        });

        await transactionService.createTransaction({
          lot_id: row.lot_id,
          material_id: row.material_id,
          transaction_type: delta > 0 ? 'Receipt' : 'Usage',
          quantity: Math.abs(delta),
          unit_of_measure: row.unit_of_measure,
          transaction_date: new Date().toISOString(),
          reference_number: 'AUDIT-ADJUSTMENT',
          performed_by: 'operator-audit',
          notes: `Audit adjustment from ${systemQty} to ${countedQty}`,
        });
      }

      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          quantity: Number(row.countedQuantity ?? row.quantity),
        })),
      );

      message.success(`Applied ${discrepancies.length} inventory adjustments`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to apply audit adjustments';
      setError(msg);
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Audit</h1>
        <p className="text-sm text-gray-500">Count physical stock and post adjustment transactions</p>
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
                { title: 'Lot', dataIndex: 'lot_id' },
                { title: 'Material', dataIndex: 'material_id' },
                {
                  title: 'System Qty',
                  dataIndex: 'quantity',
                  render: (value: number) => Number(value).toFixed(3),
                },
                {
                  title: 'Counted Qty',
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
                  title: 'Delta',
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
                Discrepancies: <strong>{discrepancies.length}</strong>
              </Typography.Text>
              <Button type="primary" loading={saving} onClick={() => void applyAdjustments()}>
                Apply Audit Adjustments
              </Button>
            </Space>
          </>
        )}
      </Card>
    </div>
  );
}
