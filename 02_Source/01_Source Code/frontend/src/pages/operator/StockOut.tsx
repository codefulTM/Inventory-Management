import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  message,
} from 'antd';
import { fetchInventoryLots } from '../../services/inventoryLotService';
import { InventoryLotAPI } from '../../services/inventory-lot.service';
import { transactionService } from '../../services/transactionService';
import type { InventoryLot } from '../../types/inventory';

type StockOutForm = {
  lot_id: string;
  quantity: number;
  reference_number?: string;
  notes?: string;
};

export default function StockOutOperator() {
  const [form] = Form.useForm<StockOutForm>();
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchInventoryLots();
        setLots(data.filter((item) => Number(item.quantity) > 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load inventory lots');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const selectedLot = useMemo(
    () => lots.find((lot) => lot.lot_id === form.getFieldValue('lot_id')),
    [form, lots],
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedLot) {
        throw new Error('Selected lot is not available');
      }

      const currentQty = Number(selectedLot.quantity);
      if (values.quantity > currentQty) {
        throw new Error(`Quantity exceeds available stock (${currentQty})`);
      }

      setSubmitting(true);
      setError(null);

      const remainingQty = currentQty - values.quantity;
      const mappedStatus: 'Quarantine' | 'Accepted' | 'Rejected' | 'Depleted' =
        remainingQty === 0
          ? 'Depleted'
          : selectedLot.status === 'Accepted' || selectedLot.status === 'Rejected'
            ? selectedLot.status
            : 'Quarantine';

      await InventoryLotAPI.update(selectedLot.lot_id, {
        quantity: remainingQty,
        status: mappedStatus,
      });

      await transactionService.createTransaction({
        lot_id: selectedLot.lot_id,
        material_id: selectedLot.material_id,
        transaction_type: 'Usage',
        quantity: values.quantity,
        unit_of_measure: selectedLot.unit_of_measure,
        transaction_date: new Date().toISOString(),
        reference_number: values.reference_number,
        performed_by: 'operator',
        notes: values.notes,
      });

      setLots((prev) =>
        prev
          .map((lot) =>
            lot.lot_id === selectedLot.lot_id
              ? {
                  ...lot,
                  quantity: remainingQty,
                  status: remainingQty === 0 ? 'Depleted' : lot.status,
                }
              : lot,
          )
          .filter((lot) => Number(lot.quantity) > 0),
      );

      message.success('Stock-out completed and usage transaction created');
      form.resetFields();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stock-out failed';
      setError(msg);
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Out</h1>
        <p className="text-sm text-gray-500">Issue materials from lot and create usage transaction</p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card loading={loading}>
        <Form form={form} layout="vertical">
          <Form.Item label="Lot" name="lot_id" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={lots.map((lot) => ({
                value: lot.lot_id,
                label: `${lot.lot_id} | ${lot.material_id} | ${lot.quantity} ${lot.unit_of_measure}`,
              }))}
            />
          </Form.Item>

          <Form.Item label="Quantity" name="quantity" rules={[{ required: true }]}>
            <InputNumber min={0.0001} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Reference Number" name="reference_number">
            <Input />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>

          {selectedLot ? (
            <Alert
              type="info"
              showIcon
              message={`Available: ${selectedLot.quantity} ${selectedLot.unit_of_measure} in ${selectedLot.storage_location || 'N/A'}`}
              style={{ marginBottom: 16 }}
            />
          ) : null}

          <Space>
            <Button type="primary" loading={submitting} onClick={() => void handleSubmit()}>
              Confirm Stock Out
            </Button>
            <Button onClick={() => form.resetFields()}>Reset</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
