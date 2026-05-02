// File: components/inventory-transaction/InventoryTransactionList.tsx
// Component hiển thị danh sách giao dịch kho (Inventory Transactions)
// Hỗ trợ 2 chế độ: "all" (tất cả giao dịch) và "my-history" (lịch sử cá nhân)
// Tính năng: phân trang, tìm kiếm, lọc theo ngày/loại giao dịch, xem chi tiết

import React, { useEffect, useRef, useState } from "react";
import { Filter, Download, Eye } from "lucide-react";
import type {
  InventoryTransaction,
  InventoryTransactionType,
} from "../../types/inventoryTransaction";
import {
  fetchMyHistory,
  fetchMyHistoryDetail,
  fetchTransaction,
  fetchTransactions,
  InventoryTransactionApiError,
} from "../../services/inventoryTransactionService";

// Props cho component InventoryTransactionList
interface Props {
  title?: string;          // Tiêu đề danh sách
  mode?: "all" | "my-history";  // Chế độ hiển thị
}

const TRANSACTION_TYPES: InventoryTransactionType[] = [
  "Receipt",
  "Usage",
  "Split",
  "Adjustment",
  "Transfer",
  "Disposal",
];

function getListErrorMessage(
  error: unknown,
  mode: "all" | "my-history",
): string {
  if (error instanceof InventoryTransactionApiError) {
    if (mode === "my-history" && error.statusCode === 400) {
      return "Khoảng ngày không hợp lệ. Vui lòng kiểm tra bộ lọc.";
    }

    return error.message || "Lỗi khi tải dữ liệu";
  }

  if (error instanceof Error) {
    return error.message || "Lỗi khi tải dữ liệu";
  }

  return "Lỗi khi tải dữ liệu";
}

function getDetailErrorMessage(
  error: unknown,
  mode: "all" | "my-history",
): string {
  if (error instanceof InventoryTransactionApiError) {
    if (mode === "my-history" && error.statusCode === 403) {
      return "Bạn không có quyền xem chi tiết giao dịch này.";
    }

    if (mode === "my-history" && error.statusCode === 404) {
      return "Không tìm thấy giao dịch hoặc giao dịch đã bị xóa.";
    }

    return error.message || "Không thể tải chi tiết giao dịch";
  }

  if (error instanceof Error) {
    return error.message || "Không thể tải chi tiết giao dịch";
  }

  return "Không thể tải chi tiết giao dịch";
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("vi-VN");
}

function isDateRangeInvalid(fromDate: string, toDate: string): boolean {
  if (!fromDate || !toDate) {
    return false;
  }

  return new Date(fromDate).getTime() > new Date(toDate).getTime();
}

const InventoryTransactionList: React.FC<Props> = ({ title, mode = "all" }) => {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [showFilter, setShowFilter] = useState(false);
  const [draftFromDate, setDraftFromDate] = useState("");
  const [draftToDate, setDraftToDate] = useState("");
  const [draftTransactionType, setDraftTransactionType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [transactionType, setTransactionType] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [selectedTransactionDetail, setSelectedTransactionDetail] =
    useState<InventoryTransaction | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const inFlightKeyRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setSelectedTransactionId(null);
    setSelectedTransactionDetail(null);
    setDetailError(null);
  }, [
    mode,
    page,
    pageSize,
    debouncedSearch,
    fromDate,
    toDate,
    transactionType,
  ]);

  const applyDateFilter = () => {
    if (isDateRangeInvalid(draftFromDate, draftToDate)) {
      setError("Từ ngày phải nhỏ hơn hoặc bằng đến ngày.");
      return;
    }

    setError(null);
    setFromDate(draftFromDate);
    setToDate(draftToDate);
    setTransactionType(draftTransactionType);
    setShowFilter(false);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftFromDate("");
    setDraftToDate("");
    setDraftTransactionType("");
    setFromDate("");
    setToDate("");
    setTransactionType("");
    setPage(1);
    setError(null);
  };

  useEffect(() => {
    async function load() {
      if (isDateRangeInvalid(fromDate, toDate)) {
        setError("Từ ngày phải nhỏ hơn hoặc bằng đến ngày.");
        return;
      }

      const requestKey = JSON.stringify({
        mode,
        page,
        pageSize,
        search: debouncedSearch,
        fromDate,
        toDate,
        transactionType,
      });

      if (inFlightKeyRef.current === requestKey) {
        return;
      }

      inFlightKeyRef.current = requestKey;
      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        if (mode === "my-history") {
          const result = await fetchMyHistory({
            page,
            limit: pageSize,
            from: fromDate || undefined,
            to: toDate || undefined,
            transaction_type:
              (transactionType as InventoryTransactionType) || undefined,
            keyword: debouncedSearch || undefined,
          });

          if (requestId !== requestIdRef.current) {
            return;
          }

          setTransactions(result.items);
          setTotalCount(result.total);
        } else {
          const result = await fetchTransactions({
            limit: pageSize,
            page,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...(fromDate ? { from: fromDate } : {}),
            ...(toDate ? { to: toDate } : {}),
            transaction_type:
              (transactionType as InventoryTransactionType) || undefined,
          });

          if (requestId !== requestIdRef.current) {
            return;
          }

          setTransactions(result.items);
          setTotalCount(result.total);
        }
      } catch (loadError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setError(getListErrorMessage(loadError, mode));
      } finally {
        if (inFlightKeyRef.current === requestKey) {
          inFlightKeyRef.current = null;
        }

        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }

    load();
  }, [
    mode,
    page,
    pageSize,
    debouncedSearch,
    fromDate,
    toDate,
    transactionType,
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const openDetail = async (transaction: InventoryTransaction) => {
    const rawTransactionId = transaction.transaction_id || transaction._id;
    const transactionId =
      typeof rawTransactionId === "string"
        ? rawTransactionId
        : rawTransactionId
          ? String(rawTransactionId)
          : "";

    setSelectedTransactionId(transactionId || "khong-xac-dinh");
    setSelectedTransactionDetail(null);
    setDetailLoading(false);
    setDetailError(null);

    if (!transactionId) {
      setDetailError("Không thể xác định mã giao dịch để xem chi tiết.");
      return;
    }

    setDetailLoading(true);

    try {
      const detail =
        mode === "my-history"
          ? await fetchMyHistoryDetail(transactionId)
          : await fetchTransaction(transactionId);
      setSelectedTransactionDetail(detail);
    } catch (detailLoadError) {
      setDetailError(getDetailErrorMessage(detailLoadError, mode));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedTransactionId(null);
    setSelectedTransactionDetail(null);
    setDetailError(null);
  };

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
    return transactions.map((t) => {
      const transactionId = t.transaction_id || t._id;
      const isSelected = Boolean(
        selectedTransactionId && selectedTransactionId === transactionId,
      );

      return (
        <tr
          key={transactionId || `${t.lot_id}-${t.transaction_date}`}
          className={`border-t border-gray-50 transition-colors ${
            isSelected ? "bg-blue-50/60" : "hover:bg-blue-50/30"
          }`}
        >
          <td className="px-5 py-4 font-bold text-gray-900">
            {t.transaction_id || "-"}
          </td>
          <td className="px-5 py-4">{formatDateTime(t.transaction_date)}</td>
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
          <td className="px-5 py-4">{t.performed_by || "-"}</td>
          <td className="px-5 py-4">{t.quantity}</td>
          <td className="px-5 py-4">{t.unit_of_measure}</td>
          <td className="px-5 py-4">
            <span className="text-gray-700 text-sm">
              {t.notes || t.reference_number || ""}
            </span>
          </td>
          <td className="px-5 py-4 flex gap-2">
            <button
              onClick={() => void openDetail(t)}
              className="text-blue-600 hover:text-blue-800"
              title="Xem chi tiết"
              aria-label="Xem chi tiết giao dịch"
            >
              <Eye size={16} />
            </button>
          </td>
        </tr>
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          {title ||
            (mode === "my-history"
              ? "Lịch sử giao dịch của tôi"
              : "Danh sách giao dịch")}
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value.slice(0, 100));
            setPage(1);
          }}
          placeholder={
            mode === "my-history"
              ? "Tìm theo mã giao dịch, số tham chiếu, lot, material..."
              : "Tìm kiếm theo mã hoặc tên..."
          }
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
          <button
            type="button"
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-bold opacity-60 cursor-not-allowed"
            title="Tính năng xuất Excel sẽ được triển khai sau"
          >
            <Download size={16} />
            Xuất Excel
          </button>

          {showFilter && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-10">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold">Từ ngày</label>
                <input
                  type="date"
                  value={draftFromDate}
                  onChange={(e) => setDraftFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded"
                />
                <label className="text-xs font-bold">Đến ngày</label>
                <input
                  type="date"
                  value={draftToDate}
                  onChange={(e) => setDraftToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded"
                />
                <>
                  <label className="text-xs font-bold">Loại giao dịch</label>
                  <select
                    value={draftTransactionType}
                    onChange={(e) => setDraftTransactionType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded"
                  >
                    <option value="">Tất cả</option>
                    {TRANSACTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </>
                {isDateRangeInvalid(draftFromDate, draftToDate) && (
                  <p className="text-xs text-red-600">
                    Từ ngày phải nhỏ hơn hoặc bằng đến ngày.
                  </p>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-300"
                  >
                    Xóa lọc
                  </button>
                  <button
                    type="button"
                    onClick={applyDateFilter}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700"
                  >
                    Áp dụng
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilter(false)}
                  className="w-full px-3 py-2 bg-white text-gray-600 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-50"
                >
                  Đóng
                </button>
                {isDateRangeInvalid(draftFromDate, draftToDate) && (
                  <p className="mt-1 text-xs text-red-500">
                    Từ ngày không được lớn hơn Đến ngày.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {searchInput.length >= 100 && (
        <p className="text-xs text-amber-700">Từ khóa tối đa 100 ký tự.</p>
      )}

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
              type="button"
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
              type="button"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {selectedTransactionId && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              Chi tiết giao dịch {selectedTransactionId}
            </h2>
            <button
              type="button"
              onClick={closeDetail}
              className="px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Đóng
            </button>
          </div>

          {detailLoading && (
            <p className="mt-4 text-sm text-gray-500">Đang tải chi tiết...</p>
          )}

          {!detailLoading && detailError && (
            <p className="mt-4 text-sm text-red-600">{detailError}</p>
          )}

          {!detailLoading && !detailError && selectedTransactionDetail && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Mã giao dịch
                </p>
                <p className="font-semibold text-gray-900">
                  {selectedTransactionDetail.transaction_id || "-"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Loại giao dịch
                </p>
                <p className="font-semibold text-gray-900">
                  {selectedTransactionDetail.transaction_type || "-"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Lot ID
                </p>
                <p className="font-semibold text-gray-900">
                  {selectedTransactionDetail.lot_id || "-"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Material ID
                </p>
                <p className="font-semibold text-gray-900">
                  {selectedTransactionDetail.material_id || "-"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Số lượng
                </p>
                <p className="font-semibold text-gray-900">
                  {selectedTransactionDetail.quantity}{" "}
                  {selectedTransactionDetail.unit_of_measure || ""}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Ngày giao dịch
                </p>
                <p className="font-semibold text-gray-900">
                  {formatDateTime(selectedTransactionDetail.transaction_date)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Người thực hiện
                </p>
                <p className="font-semibold text-gray-900">
                  {selectedTransactionDetail.performed_by || "-"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Số tham chiếu
                </p>
                <p className="font-semibold text-gray-900">
                  {selectedTransactionDetail.reference_number || "-"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 md:col-span-2">
                <p className="text-gray-400 text-xs uppercase tracking-wide">
                  Ghi chú
                </p>
                <p className="font-semibold text-gray-900 whitespace-pre-wrap">
                  {selectedTransactionDetail.notes || "-"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryTransactionList;
