import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  message,
  Form,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Material } from "../../../types/Material";
import { materialService } from "../../../services/material.service";

const { Option } = Select;

// Helper: get all material types from the string union
const MATERIAL_TYPES = [
  "API",
  "Excipient",
  "Dietary Supplement",
  "Container",
  "Closure",
  "Process Chemical",
  "Testing Material",
];

const statusColors: Record<string, string> = {
  Pending: "orange",
  Approved: "green",
  Rejected: "red",
};

const getColumns = (
  onEdit: (m: Material) => void,
  onDelete: (m: Material) => void,
): ColumnsType<Material> => [
  { title: "Mã vật tư", dataIndex: "material_id", key: "material_id" },
  { title: "Tên vật tư", dataIndex: "material_name", key: "material_name" },
  { title: "Loại", dataIndex: "material_type", key: "material_type" },
  {
    title: "Trạng thái",
    dataIndex: "status",
    key: "status",
    render: (status: string) => (
      <Tag color={statusColors[status] || "default"}>{status}</Tag>
    ),
  },
  {
    title: "Ngày tạo",
    dataIndex: "created_date",
    key: "created_date",
    render: (date: string) => new Date(date).toLocaleString(),
  },
  { title: "Người tạo", dataIndex: "created_by", key: "created_by" },
  {
    title: "Thao tác",
    key: "action",
    render: (_, record) => (
      <Space>
        <Button type="link" onClick={() => onEdit(record)}>
          Sửa
        </Button>
        <Button type="link" danger onClick={() => onDelete(record)}>
          Xóa
        </Button>
      </Space>
    ),
  },
];

const MaterialList: React.FC = () => {
  const [data, setData] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [search, type]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await materialService.findAll(1, 100);
      console.log("materialService.findAll result:", res);
      const result: Material[] = Array.isArray(res) ? res : [];
      let filtered: Material[] = result;
      if (search)
        filtered = filtered.filter(
          (m) =>
            m.material_name?.toLowerCase().includes(search.toLowerCase()) ||
            m.material_id?.toLowerCase().includes(search.toLowerCase()),
        );
      if (type) filtered = filtered.filter((m) => m.material_type === type);
      console.log("MaterialList data:", filtered);
      setData(filtered);
    } finally {
      setLoading(false);
    }
  }

  const show = (material?: Material) => {
    setEditing(material || null);
    setVisible(true);
    if (material) {
      form.setFieldsValue(material);
    } else {
      form.resetFields();
    }
  };

  const hide = () => {
    setVisible(false);
    setEditing(null);
    setTimeout(() => form.resetFields(), 200); // ensure reset after modal close
  };

  const handleOk = async () => {
    setModalLoading(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await materialService.update(editing._id, values);
        message.success("Cập nhật thành công");
      } else {
        await materialService.create(values);
        message.success("Tạo mới thành công");
      }
      hide();
      await fetchData();
    } catch (e) {
      // ignore
    } finally {
      setModalLoading(false);
    }
  };

  const handleEdit = (record: Material) => show(record);
  const handleDelete = (record: Material) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: `Bạn có chắc muốn xóa vật tư "${record.material_name}"?`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await materialService.delete(record._id);
          message.success("Đã xóa thành công");
          fetchData();
        } catch (e) {
          message.error("Xóa thất bại");
        }
      },
    });
  };

  return (
    <div>
      <h2>Danh sách vật tư</h2>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Tìm kiếm mã/tên vật tư"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(v) => setSearch(v)}
          allowClear
          style={{ width: 220 }}
        />
        <Select
          placeholder="Loại vật tư"
          value={type}
          onChange={(v) => setType(v)}
          allowClear
          style={{ width: 180 }}
        >
          {MATERIAL_TYPES.map((t) => (
            <Option key={t} value={t}>
              {t}
            </Option>
          ))}
        </Select>
        <Button type="primary" onClick={() => show()}>
          Thêm mới
        </Button>
      </Space>
      <Table
        columns={getColumns(handleEdit, handleDelete)}
        dataSource={data}
        rowKey={(record) => record._id || record.material_id}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      <Modal
        title={editing ? "Sửa vật tư" : "Thêm mới vật tư"}
        open={visible}
        onCancel={hide}
        onOk={handleOk}
        confirmLoading={modalLoading}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: "Pending" }}
        >
          <Form.Item
            name="material_id"
            label="Mã vật tư"
            rules={[{ required: true, message: "Vui lòng nhập mã vật tư" }]}
            validateTrigger="onChange"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="part_number"
            label="Part Number"
            rules={[{ required: true, message: "Vui lòng nhập Part Number" }]}
            validateTrigger="onChange"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="material_name"
            label="Tên vật tư"
            rules={[{ required: true, message: "Vui lòng nhập tên vật tư" }]}
            validateTrigger="onChange"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="material_type"
            label="Loại vật tư"
            rules={[{ required: true, message: "Vui lòng chọn loại vật tư" }]}
            validateTrigger="onChange"
          >
            <Select placeholder="Chọn loại vật tư" allowClear>
              {MATERIAL_TYPES.map((t) => (
                <Option key={t} value={t}>
                  {t}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="storage_conditions" label="Điều kiện bảo quản">
            <Input />
          </Form.Item>
          <Form.Item name="specification_document" label="Tài liệu tiêu chuẩn">
            <Input />
          </Form.Item>
          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
            validateTrigger="onChange"
          >
            <Select placeholder="Chọn trạng thái" allowClear>
              <Option value="Pending">Pending</Option>
              <Option value="Approved">Approved</Option>
              <Option value="Rejected">Rejected</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MaterialList;
