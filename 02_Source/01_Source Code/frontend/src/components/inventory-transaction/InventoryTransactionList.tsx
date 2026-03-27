import React, { useState } from "react";
import { Filter, Download, Eye, Edit2 } from "lucide-react";
import type { InventoryTransaction } from "../../types/inventoryTransaction";
import { fetchTransactions } from "../../services/inventoryTransactionService";

interface Props {
  title?: string;
}

const InventoryTransactionList: React.FC<Props> = ({ title }) => {
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0); // total items matching server filter

  const [showFilter, setShowFilter] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const applyDateFilter = () => {
    // closing menu; filtering happens automatically via derived state below
    setShowFilter(false);
    setPage(1);
  };

  // reload whenever page/pageSize/search/fromDate/toDate changes
  React.useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const q = {
        limit: pageSize,
        page,
        ...(search ? { search } : {}),
        ...(fromDate ? { from: fromDate } : {}),
        ...(toDate ? { to: toDate } : {}),
      };
      console.log("Loading transactions with params:", q);
      try {
        const result: Awaited<ReturnType<typeof fetchTransactions>> =
          await fetchTransactions(q);
        setTransactions(result.items);
        setTotalCount(result.total);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Lỗi khi tải dữ liệu");
      }
      setLoading(false);
    }
    load();
  }, [page, pageSize, search, fromDate, toDate]);

  // compute pages from totalCount returned by server
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paged = transactions; // server does filtering/paging

  function renderBody() {
    if (loading) {
      return (
        <tr>
          <td colSpan={9} className="p-16 text-center text-gray-400">
            Đang tải...
          </td>
        </tr>
      );
    }
    if (error) {
      return (
        <tr>
          <td colSpan={9} className="p-16 text-center text-red-500">
            {error}
          </td>
        </tr>
      );
    }
    if (transactions.length === 0) {
      return (
        <tr>
          <td colSpan={9} className="p-16 text-center text-gray-300">
            Không có giao dịch nào
          </td>
        </tr>
      );
    }
    return paged.map((t) => (
      <tr
        key={t.transaction_id}
        className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors"
      >
        <td className="px-5 py-4 font-bold text-gray-900">
          {t.transaction_id}
        </td>
        <td className="px-5 py-4">
          {new Date(t.transaction_date).toLocaleDateString()}
        </td>
        <td className="px-5 py-4">
          <span
            className={`font-bold ${
              t.transaction_type === "Receipt"
                ? "text-blue-600"
                : t.transaction_type === "Usage"
                  ? "text-red-600"
                  : "text-yellow-600"
            }`}
          >
            {t.transaction_type}
          </span>
        </td>
        <td className="px-5 py-4">{t.lot_id}</td>
        <td className="px-5 py-4">{t.performed_by}</td>
        <td className="px-5 py-4">{t.quantity}</td>
        <td className="px-5 py-4">{t.unit_of_measure}</td>
        <td className="px-5 py-4">
          <span className="text-gray-700 text-sm">
            {t.notes || t.reference_number || ""}
          </span>
        </td>
        <td className="px-5 py-4 flex gap-2">
          <button className="text-blue-600 hover:text-blue-800">
            <Eye size={16} />
          </button>
          <button className="text-green-600 hover:text-green-800">
            <Edit2 size={16} />
          </button>
        </td>
      </tr>
    ));
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          {title || "Danh sách giao dịch"}
        </h1>
      </div>

      {/* search and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm theo mã hoặc tên..."
          className="w-full sm:w-1/2 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <div className="relative flex gap-2">
          <button
            onClick={() => setShowFilter((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
          >
            <Filter size={16} />
            Bộ lọc
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all">
            <Download size={16} />
            Xuất Excel
          </button>

          {showFilter && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-10">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold">Từ ngày</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded"
                />
                <label className="text-xs font-bold">Đến ngày</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded"
                />
                <button
                  onClick={() => applyDateFilter()}
                  className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Mã giao dịch",
                "Ngày",
                "Loại",
                "Lot ID",
                "Người thực hiện",
                "Số lượng",
                "Đơn vị",
                "Ghi chú",
                "Thao tác",
              ].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-widest"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{renderBody()}</tbody>
        </table>
        {/* pagination controls */}
        <div className="px-5 py-3 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xs">Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs border border-gray-200 rounded px-2 py-1"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-xs">mục mỗi trang</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 text-xs border rounded disabled:opacity-50"
            >
              &lt;
            </button>
            <span className="text-xs">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 text-xs border rounded disabled:opacity-50"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryTransactionList;
