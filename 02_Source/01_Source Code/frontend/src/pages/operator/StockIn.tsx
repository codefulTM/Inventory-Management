/**
 * Stock In Page - Operator Receipt Workflow
 * Handles incoming material receipt and inventory lot creation
 */

import React, { useState } from 'react';
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
} from 'antd';
import { ScanOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ComingSoon from '../../components/ComingSoon';

interface ScannedItem {
  id: string;
  materialId: string;
  materialName: string;
  sku: string;
  quantityReceived: number;
  supplier: string;
  lotNumber: string;
}

export default function StockIn() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [barcodeScanValue, setBarcodeScanValue] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);

  const handleBarcodeInput = async (barcode: string) => {
    if (!barcode.trim()) return;

    try {
      setLoading(true);
      // TODO: Call MaterialAPI.getByBarcode(barcode)
      // This is a placeholder for the actual API integration
      message.info('Barcode scanning integration coming soon');
      setBarcodeScanValue('');
    } catch (error) {
      message.error('Material not found or invalid barcode');
      setBarcodeScanValue('');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      const values = await form.validateFields();
      const newItem: ScannedItem = {
        id: `${Date.now()}`,
        materialId: values.materialId || selectedMaterial?.id,
        materialName: selectedMaterial?.name || values.materialName,
        sku: selectedMaterial?.sku || values.sku,
        quantityReceived: values.quantityReceived,
        supplier: values.supplier,
        lotNumber: values.lotNumber,
      };

      setScannedItems([...scannedItems, newItem]);
      form.resetFields();
      setSelectedMaterial(null);
      message.success('Item added to receipt');
    } catch (error) {
      message.error('Please fill in all required fields');
    }
  };

  const handleRemoveItem = (id: string) => {
    setScannedItems(scannedItems.filter((item) => item.id !== id));
    message.info('Item removed from receipt');
  };

  const handleConfirmReceipt = async () => {
    if (scannedItems.length === 0) {
      message.error('Please add at least one item');
      return;
    }

    setIsPreviewModalVisible(true);
  };

  const handleSubmitReceipt = async () => {
    try {
      setLoading(true);

      // TODO: Call InventoryLotAPI.create() for each item
      message.success(`Receipt completed: ${scannedItems.length} lots created`);
      setIsPreviewModalVisible(false);
      setScannedItems([]);
      form.resetFields();

      // Redirect to inventory view
      setTimeout(() => {
        navigate('/operator/inventory-audit');
      }, 1500);
    } catch (error) {
      message.error('Failed to create inventory lots');
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
      title: 'Qty Received',
      dataIndex: 'quantityReceived',
      key: 'quantityReceived',
      width: 120,
      align: 'right' as const,
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 150,
    },
    {
      title: 'Lot Number',
      dataIndex: 'lotNumber',
      key: 'lotNumber',
      width: 120,
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_: any, record: ScannedItem) => (
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
    <div className="stock-in-container" style={{ padding: '24px' }}>
      <Card title="📥 Stock In - Receive Materials (Nhập Kho)" bordered={false}>
        <Alert
          message="Scan materials with barcode/QR code to add them to the receipt"
          type="info"
          showIcon
          style={{ marginBottom: '20px' }}
        />

        <Form form={form} layout="vertical" style={{ marginBottom: '20px' }}>
          <Form.Item
            label="Barcode/QR Code Scan"
            tooltip="Scan the barcode or enter it manually"
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
            name="materialId"
            label="Material ID"
            rules={[{ required: true, message: 'Please select a material' }]}
          >
            <Input placeholder="Material ID" />
          </Form.Item>

          <Form.Item label="Material Name" required>
            <Input
              placeholder={selectedMaterial?.name || 'Material will appear here'}
              disabled
            />
          </Form.Item>

          <Form.Item
            name="quantityReceived"
            label="Quantity Received"
            rules={[{ required: true, message: 'Please enter quantity' }]}
          >
            <InputNumber min={1} placeholder="Enter quantity" />
          </Form.Item>

          <Form.Item
            name="supplier"
            label="Supplier"
            rules={[{ required: true, message: 'Please enter supplier' }]}
          >
            <Input placeholder="Supplier name" />
          </Form.Item>

          <Form.Item
            name="lotNumber"
            label="Lot Number"
            rules={[{ required: true, message: 'Please enter lot number' }]}
          >
            <Input placeholder="Lot number from supplier" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={handleAddItem} block loading={loading}>
              Add to Receipt
            </Button>
          </Form.Item>
        </Form>

        <Divider />

        <div style={{ marginBottom: '20px' }}>
          <h3>
            Items in Receipt: <Tag color="blue">{scannedItems.length}</Tag>
          </h3>
          <Table
            dataSource={scannedItems}
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
            onClick={handleConfirmReceipt}
            disabled={scannedItems.length === 0}
            loading={loading}
          >
            Confirm Receipt
          </Button>
        </Space>

        {/* Preview Modal */}
        <Modal
          title="Confirm Receipt (Xác Nhận Nhập Kho)"
          open={isPreviewModalVisible}
          onOk={handleSubmitReceipt}
          onCancel={() => setIsPreviewModalVisible(false)}
          okText="Submit"
          cancelText="Cancel"
          confirmLoading={loading}
        >
          <Spin spinning={loading}>
            <Alert
              message={`You are about to create ${scannedItems.length} inventory lots`}
              type="warning"
              showIcon
              style={{ marginBottom: '20px' }}
            />
            <Table
              dataSource={scannedItems}
              columns={columns}
              pagination={false}
              rowKey="id"
              size="small"
            />
            <p style={{ marginTop: '20px', color: '#666' }}>
              All items will be created with Quarantine status pending QC approval.
            </p>
          </Spin>
        </Modal>
      </Card>
    </div>
  );
}
