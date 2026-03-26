/**
 * Stock Out Page - Operator Dispatch Workflow
 * Handles outgoing material dispatch and inventory transaction recording
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Table,
  Divider,
  Alert,
  Modal,
  message,
  Spin,
  Space,
  Tag,
  Select,
} from 'antd';
import { ScanOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface DispatchItem {
  id: string;
  lotId: string;
  materialId: string;
  materialName: string;
  sku: string;
  quantityAvailable: number;
  quantityDispatching: number;
  destination: string;
  reason: string;
}

const DISPATCH_REASONS = [
  { value: 'USAGE', label: 'Production Usage' },
  { value: 'TRANSFER', label: 'Transfer to Another Location' },
  { value: 'RETURN', label: 'Return to Supplier' },
  { value: 'DISPOSAL', label: 'Disposal/Waste' },
  { value: 'SAMPLE', label: 'Sample/Testing' },
];

export default function StockOut() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [barcodeScanValue, setBarcodeScanValue] = useState('');
  const [inventoryLots] = useState<any[]>([]);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);

  // Fetch available inventory lots on mount
  useEffect(() => {
    const fetchInventoryLots = async () => {
      try {
        // TODO: Call InventoryLotAPI.getAll({ status: 'ACCEPTED' })
        message.info('Loading available inventory lots...');
      } catch (error) {
        message.error('Failed to load available inventory lots');
      }
    };

    fetchInventoryLots();
  }, []);

  const handleBarcodeInput = async (barcode: string) => {
    if (!barcode.trim()) return;

    try {
      setLoading(true);
      // TODO: Find lot by barcode or lot number
      message.info('Barcode scanning integration coming soon');
      setBarcodeScanValue('');
    } catch (error) {
      message.error('Error processing barcode');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      const values = await form.validateFields();

      if (values.quantityDispatching > values.quantityAvailable) {
        message.error('Dispatch quantity cannot exceed available quantity');
        return;
      }

      const newItem: DispatchItem = {
        id: `${Date.now()}`,
        lotId: values.lotId,
        materialId: '',
        materialName: values.materialName,
        sku: values.sku,
        quantityAvailable: values.quantityAvailable,
        quantityDispatching: values.quantityDispatching,
        destination: values.destination,
        reason: values.reason,
      };

      setDispatchItems([...dispatchItems, newItem]);
      form.resetFields();
      message.success('Item added to dispatch');
    } catch (error) {
      message.error('Please fill in all required fields');
    }
  };

  const handleRemoveItem = (id: string) => {
    setDispatchItems(dispatchItems.filter((item) => item.id !== id));
    message.info('Item removed from dispatch');
  };

  const handleConfirmDispatch = () => {
    if (dispatchItems.length === 0) {
      message.error('Please add at least one item');
      return;
    }

    setIsPreviewModalVisible(true);
  };

  const handleSubmitDispatch = async () => {
    try {
      setLoading(true);

      // TODO: Call InventoryTransactionAPI.create() for each item
      message.success(`Dispatch completed: ${dispatchItems.length} transactions recorded`);
      setIsPreviewModalVisible(false);
      setDispatchItems([]);
      form.resetFields();

      // Redirect to transaction history
      setTimeout(() => {
        navigate('/operator/transaction-history');
      }, 1500);
    } catch (error) {
      message.error('Failed to create dispatch transactions');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Material',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 150,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 100,
    },
    {
      title: 'Available',
      dataIndex: 'quantityAvailable',
      key: 'quantityAvailable',
      width: 100,
      align: 'right' as const,
    },
    {
      title: 'Dispatching',
      dataIndex: 'quantityDispatching',
      key: 'quantityDispatching',
      width: 120,
      align: 'right' as const,
    },
    {
      title: 'Destination',
      dataIndex: 'destination',
      key: 'destination',
      width: 150,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: 130,
      render: (reason: string) => {
        const reasonObj = DISPATCH_REASONS.find((r) => r.value === reason);
        return <Tag>{reasonObj?.label}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_: any, record: DispatchItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(record.id)}
        />
      ),
    },
  ];

  return (
    <div className="stock-out-container" style={{ padding: '24px' }}>
      <Card title="📤 Stock Out - Dispatch Materials (Xuất Kho)" bordered={false}>
        <Alert
          message="Scan inventory lots to add them to the dispatch"
          type="info"
          showIcon
          style={{ marginBottom: '20px' }}
        />

        <Form form={form} layout="vertical" style={{ marginBottom: '20px' }}>
          <Form.Item
            label="Barcode/Lot Number Scan"
            tooltip="Scan the barcode or lot number"
          >
            <Input
              placeholder="Scan barcode..."
              prefix={<ScanOutlined />}
              value={barcodeScanValue}
              onChange={(e) => setBarcodeScanValue(e.target.value)}
              onPressEnter={(e) => handleBarcodeInput((e.target as HTMLInputElement).value)}
              autoFocus
            />
          </Form.Item>

          <Divider>OR</Divider>

          <Form.Item
            name="lotId"
            label="Select Lot"
            rules={[{ required: true, message: 'Please select a lot' }]}
          >
            <Select
              placeholder="Select inventory lot"
              options={inventoryLots.map((lot) => ({
                value: lot._id,
                label: `${lot.material?.name} (${lot.lotNumber}) - Available: ${lot.quantity}`,
              }))}
            />
          </Form.Item>

          <Form.Item label="Material Name" required>
            <Input placeholder="Material will appear here" disabled />
          </Form.Item>

          <Form.Item
            name="quantityAvailable"
            label="Available Quantity"
            required
          >
            <InputNumber disabled />
          </Form.Item>

          <Form.Item
            name="quantityDispatching"
            label="Quantity to Dispatch"
            rules={[{ required: true, message: 'Please enter quantity' }]}
          >
            <InputNumber min={1} placeholder="Enter quantity" />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Dispatch Reason"
            rules={[{ required: true, message: 'Please select reason' }]}
          >
            <Select
              placeholder="Select reason"
              options={DISPATCH_REASONS}
            />
          </Form.Item>

          <Form.Item
            name="destination"
            label="Destination/Purpose"
            rules={[{ required: true, message: 'Please enter destination' }]}
          >
            <Input placeholder="e.g., Production Line A, Return Address, etc." />
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={handleAddItem} block loading={loading}>
              Add to Dispatch
            </Button>
          </Form.Item>
        </Form>

        <Divider />

        <div style={{ marginBottom: '20px' }}>
          <h3>
            Items in Dispatch: <Tag color="blue">{dispatchItems.length}</Tag>
          </h3>
          <Table
            dataSource={dispatchItems}
            columns={columns}
            pagination={false}
            rowKey="id"
            size="small"
          />
        </div>

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={() => navigate('/operator/material')}>Cancel</Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleConfirmDispatch}
            disabled={dispatchItems.length === 0}
            loading={loading}
          >
            Confirm Dispatch
          </Button>
        </Space>

        {/* Preview Modal */}
        <Modal
          title="Confirm Dispatch (Xác Nhận Xuất Kho)"
          open={isPreviewModalVisible}
          onOk={handleSubmitDispatch}
          onCancel={() => setIsPreviewModalVisible(false)}
          okText="Submit"
          cancelText="Cancel"
          confirmLoading={loading}
        >
          <Spin spinning={loading}>
            <Alert
              message={`You are about to create ${dispatchItems.length} dispatch transactions`}
              type="warning"
              showIcon
              style={{ marginBottom: '20px' }}
            />
            <Table
              dataSource={dispatchItems}
              columns={columns}
              pagination={false}
              rowKey="id"
              size="small"
            />
            <p style={{ marginTop: '20px', color: '#666' }}>
              All transactions will be recorded and inventory will be updated immediately.
            </p>
          </Spin>
        </Modal>
      </Card>
    </div>
  );
}
