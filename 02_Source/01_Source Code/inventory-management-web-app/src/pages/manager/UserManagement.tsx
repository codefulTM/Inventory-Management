import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import {
  createUser,
  listUsers,
  searchUsers,
  updateUser,
  type UserItem,
  type UserRole,
} from '../../services/userService';

type UserFormValues = {
  username?: string;
  email: string;
  role: UserRole;
};

const roleOptions: UserRole[] = [
  'Manager',
  'Operator',
  'Quality Control Technician',
  'IT Administrator',
];

export default function UserManagementManager() {
  const [form] = Form.useForm<UserFormValues>();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const modalTitle = useMemo(
    () => (editingUser ? 'Update User' : 'Create User'),
    [editingUser],
  );

  const fetchUsers = async (targetPage = page, targetLimit = limit, query = activeSearch) => {
    setLoading(true);
    setError(null);
    try {
      const response = query.trim()
        ? await searchUsers(query.trim(), targetPage, targetLimit)
        : await listUsers(targetPage, targetLimit);

      setUsers(response.data || []);
      setTotal(response.pagination?.total || 0);
      setPage(response.pagination?.page || targetPage);
      setLimit(response.pagination?.limit || targetLimit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers(1, limit, activeSearch);
  }, [activeSearch]);

  const openCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'Operator' });
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    form.setFieldsValue({
      email: user.email,
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingUser) {
        await updateUser(editingUser.user_id, {
          email: values.email,
          role: values.role,
        });
        message.success('User updated successfully');
      } else {
        await createUser({
          username: values.username || '',
          email: values.email,
          role: values.role,
        });
        message.success('User created successfully');
      }

      closeModal();
      await fetchUsers(page, limit, activeSearch);
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    try {
      setSubmitting(true);
      await updateUser(user.user_id, { is_active: !user.is_active });
      message.success(user.is_active ? 'User deactivated' : 'User activated');
      await fetchUsers(page, limit, activeSearch);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = () => {
    setActiveSearch(searchText);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500">
          Manage user accounts, role assignment and activation state
        </p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            allowClear
            placeholder="Search by username or email"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 280 }}
          />
          <Button onClick={handleSearch}>Search</Button>
          <Button
            onClick={() => {
              setSearchText('');
              setActiveSearch('');
            }}
          >
            Reset
          </Button>
          <Button type="primary" onClick={openCreateModal}>
            Create User
          </Button>
        </Space>

        {loading ? (
          <div className="py-12 text-center">
            <Spin />
          </div>
        ) : (
          <Table
            rowKey="user_id"
            dataSource={users}
            pagination={{
              current: page,
              pageSize: limit,
              total,
              showSizeChanger: true,
              onChange: (nextPage, nextPageSize) => {
                void fetchUsers(nextPage, nextPageSize, activeSearch);
              },
            }}
            columns={[
              { title: 'Username', dataIndex: 'username' },
              { title: 'Email', dataIndex: 'email' },
              {
                title: 'Role',
                dataIndex: 'role',
                render: (role: UserRole) => <Tag color="blue">{role}</Tag>,
              },
              {
                title: 'Status',
                dataIndex: 'is_active',
                render: (isActive: boolean) => (
                  <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Tag>
                ),
              },
              {
                title: 'Last Login',
                dataIndex: 'last_login',
                render: (value?: string) =>
                  value ? new Date(value).toLocaleString() : 'Never',
              },
              {
                title: 'Action',
                key: 'action',
                render: (_: unknown, record: UserItem) => (
                  <Space>
                    <Button size="small" onClick={() => openEditModal(record)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      danger={record.is_active}
                      onClick={() => void handleToggleActive(record)}
                    >
                      {record.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title={modalTitle}
        open={isModalOpen}
        onOk={() => void handleSubmit()}
        onCancel={closeModal}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {!editingUser ? (
            <Form.Item
              label="Username"
              name="username"
              rules={[{ required: true, message: 'Please input username' }]}
            >
              <Input maxLength={50} />
            </Form.Item>
          ) : null}

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please input email' },
              { type: 'email', message: 'Invalid email format' },
            ]}
          >
            <Input maxLength={100} />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Please select role' }]}
          >
            <Select
              options={roleOptions.map((role) => ({
                label: role,
                value: role,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
