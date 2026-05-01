import { useEffect, useState } from "react";
import { Table, Button, Input, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { BinAPI, type BinWorklistItem } from "../../services/bin.service";
import BinDetailDrawer from "../../components/manager/BinDetailDrawer";
import Toast from "../../components/Toast";
import BinEditModal from "../../components/manager/BinEditModal";

export default function BinWorklist() {
  const [items, setItems] = useState<BinWorklistItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedBin, setSelectedBin] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<{
    bin_code: string;
    expected_qty?: number;
    warehouse_id?: string;
  } | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function formatDate(d?: string | null) {
    if (!d) return "Chưa được kiểm";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "Chưa được kiểm";
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  const columns: ColumnsType<BinWorklistItem> = [
    {
      title: "Mã vị trí kệ",
      dataIndex: "bin_code",
      key: "bin_code",
    },
    {
      title: "Mã kho",
      dataIndex: "warehouse_id",
      key: "warehouse_id",
      render: (v) => v ?? "-",
    },
    {
      title: "Số lượng dự kiến",
      dataIndex: "expected_qty",
      key: "expected_qty",
      render: (v) => v ?? "-",
    },
    {
      title: "Số lô",
      dataIndex: "lots",
      key: "lots",
      render: (lots) => (Array.isArray(lots) ? lots.length : 0),
    },
    {
      title: "Ngày kiểm gần nhất",
      dataIndex: "last_count_date",
      key: "last_count_date",
      render: (d) => formatDate(d),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            onClick={() => setSelectedBin(record.bin_code)}
          >
            Mở
          </Button>
          <Button
            onClick={() => {
              setEditingBin({
                bin_code: record.bin_code,
                expected_qty: record.expected_qty,
                warehouse_id: (record as any).warehouse_id,
              });
              setEditModalOpen(true);
            }}
          >
            Sửa
          </Button>
        </Space>
      ),
    },
  ];

  async function load() {
    setLoading(true);
    try {
      const { items: data, total: t } = await BinAPI.getWorklist({
        page,
        limit,
        q: searchTerm,
      });
      setItems(data || []);
      setTotal(t || 0);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: {
    bin_code: string;
    expected_qty?: number;
    warehouse_id?: string;
  }) {
    const { result, error } = await BinAPI.createBin(payload);
    if (error)
      return setToast({ message: "Tạo vị trí kệ thất bại.", type: "error" });
    setToast({ message: "Tạo vị trí kệ thành công.", type: "success" });
    setEditModalOpen(false);
    load();
  }

  async function handleUpdate(
    bin_code: string,
    payload: { expected_qty?: number; warehouse_id?: string },
  ) {
    const { result, error } = await BinAPI.updateBin(bin_code, payload);
    if (error)
      return setToast({ message: "Cập nhật thất bại.", type: "error" });
    setToast({ message: "Cập nhật thành công.", type: "success" });
    setEditingBin(null);
    setEditModalOpen(false);
    load();
  }

  async function handleDelete(bin_code: string) {
    if (!confirm(`Xác nhận xóa vị trí kệ ${bin_code}?`)) return;
    const { result, error } = await BinAPI.deleteBin(bin_code);
    if (error) return setToast({ message: "Xóa thất bại.", type: "error" });
    setToast({ message: "Xóa thành công.", type: "success" });
    load();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-linear-to-br from-blue-600 to-blue-700 text-white px-5 py-7 flex justify-between items-center flex-wrap gap-5 shadow-md">
        <div className="flex-1 min-w-0">
          <h1 className="m-0 mb-2 text-4xl font-bold">Kiểm kê kệ</h1>
          <p className="m-0 text-sm opacity-90">
            Quản lý vị trí kệ, tạo vị trí mới và kiểm kê theo kệ
          </p>
        </div>
        <button
          className="px-6 py-3 bg-white text-blue-600 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          onClick={() => {
            setEditingBin(null);
            setEditModalOpen(true);
          }}
        >
          + Thêm vị trí kệ
        </button>
      </header>

      <div className="px-5 py-0 max-w-6xl mx-auto">
        <section className="mb-7 mt-6">
          <div className="flex items-center gap-3">
            <Input.Search
              placeholder="Tìm mã vị trí kệ hoặc tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={() => {
                if (page === 1) void load();
                else setPage(1);
              }}
              allowClear
              style={{ width: 360 }}
            />
          </div>
        </section>

        <div className="relative min-h-96">
          <div>
            <Table
              columns={columns}
              dataSource={items}
              rowKey={(r) => r.bin_code}
              loading={loading}
              pagination={{
                current: page,
                pageSize: limit,
                total,
                onChange: (p) => setPage(p),
              }}
            />
          </div>
        </div>
      </div>

      {selectedBin && (
        <BinDetailDrawer
          binCode={selectedBin}
          onClose={() => {
            setSelectedBin(null);
            load();
          }}
          onNotify={(message: string, type: "success" | "error") =>
            setToast({ message, type })
          }
        />
      )}

      <BinEditModal
        open={editModalOpen}
        initial={editingBin ?? undefined}
        onClose={() => {
          setEditModalOpen(false);
          setEditingBin(null);
        }}
        onSave={async (payload) => {
          if (editingBin) {
            await handleUpdate(editingBin.bin_code, {
              expected_qty: payload.expected_qty,
              warehouse_id: payload.warehouse_id,
            });
          } else {
            await handleCreate(payload);
          }
        }}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
