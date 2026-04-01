import { useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, message, Space } from 'antd';
import { createInventoryLot } from '../../services/inventoryLotService';
import { transactionService } from '../../services/transactionService';

type StockInForm = {
  lot_id: string;
  material_id: string;
  manufacturer_name: string;
  manufacturer_lot: string;
  supplier_name: string;
  quantity: number;
  unit_of_measure: string;
  storage_location: string;
  expiration_date: string;
  reference_number?: string;
  notes?: string;
};

export default function StockInOperator() {
  const [form] = Form.useForm<StockInForm>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setError(null);

      const nowIso = new Date().toISOString();
      const receivedDate = nowIso.slice(0, 10);

      await createInventoryLot({
        lot_id: values.lot_id,
        material_id: values.material_id,
        manufacturer_name: values.manufacturer_name,
        manufacturer_lot: values.manufacturer_lot,
        supplier_name: values.supplier_name,
        received_date: receivedDate,
        expiration_date: values.expiration_date,
        status: 'Quarantine',
        quantity: values.quantity,
        unit_of_measure: values.unit_of_measure,
        storage_location: values.storage_location,
        is_sample: false,
        notes: values.notes,
      });

      await transactionService.createTransaction({
        lot_id: values.lot_id,
        material_id: values.material_id,
        transaction_type: 'Receipt',
        quantity: values.quantity,
        unit_of_measure: values.unit_of_measure,
        transaction_date: nowIso,
        reference_number: values.reference_number,
        performed_by: 'operator',
        notes: values.notes,
      });

      message.success('Stock-in completed and receipt transaction created');
      form.resetFields();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stock-in failed';
      setError(msg);
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock In</h1>
        <p className="text-sm text-gray-500">Receive lot into quarantine and create receipt transaction</p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card>
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item label="Lot ID" name="lot_id" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Material ID" name="material_id" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Manufacturer" name="manufacturer_name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Manufacturer Lot" name="manufacturer_lot" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Supplier" name="supplier_name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Quantity" name="quantity" rules={[{ required: true }]}>
              <InputNumber min={0.0001} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Unit" name="unit_of_measure" rules={[{ required: true }]}>
              <Input placeholder="kg / pcs / l" />
            </Form.Item>
            <Form.Item label="Storage Location" name="storage_location" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Expiration Date" name="expiration_date" rules={[{ required: true }]}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Reference Number" name="reference_number">
              <Input />
            </Form.Item>
          </div>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Space>
            <Button type="primary" loading={submitting} onClick={() => void handleSubmit()}>
              Confirm Stock In
            </Button>
            <Button onClick={() => form.resetFields()}>Reset</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
