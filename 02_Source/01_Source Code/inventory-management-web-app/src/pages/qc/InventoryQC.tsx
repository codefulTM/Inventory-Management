/**
 * InventoryQC Page (QC)
 * Trang quản lý tồn kho từ góc độ QC
 * 
 * 2 Tab chính:
 * - Tab 'alert': Cảnh báo lô sắp hết hạn (≤ 30 ngày) hoặc đã hết hạn
 *   + Hiển thị danh sách lô cần kiểm tra lại (re-test)
 *   + Mở modal để gia hạn (extend) hoặc hủy lô (discard)
 * - Tab 'quarantine': Danh sách lô có thể cách ly
 *   + Hỗ trợ chọn nhiều lô và cách ly hàng loạt (bulk quarantine)
 * 
 * Hiển thị thông tin: mã lô, tên nguyên liệu, vị trí kho, số lượng, hạn sử dụng
 * Màu sắc badge: Quarantine (vàng), Accepted (xanh), Rejected (đỏ), Hold (tím), Depleted (xám)
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Lock, X, MapPin } from 'lucide-react';
import Toast from '../../components/Toast';
import { getInventoryLots, submitRetest, bulkQuarantine } from '../../services/qcServices';
import { useAuth } from '../../hooks/useAuth';
import type { InventoryLot } from '../../types/qc';

type Tab = 'alert' | 'quarantine';

/**
 * Xác định số ngày còn lại đến hạn sử dụng
 * @param expirationDate - Ngày hết hạn của lô
 * @returns Số ngày còn lại (âm = đã hết hạn), null nếu không có ngày
 */
function getDaysUntilExpiry(expirationDate?: string): number | null {
  if (!expirationDate) return null;
  return Math.ceil(
    (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

// Màu sắc badge cho các trạng thái lô hàng
const STATUS_BADGE: Record<string, string> = {
  Quarantine: 'bg-amber-100 text-amber-700',   // Vàng - Chờ kiểm định
  Accepted: 'bg-green-100 text-green-700',      // Xanh - Đạt chuẩn
  Rejected: 'bg-red-100 text-red-700',        // Đỏ - Từ chối
  Hold: 'bg-purple-100 text-purple-700',      // Tím - Tạm giữ
  Depleted: 'bg-gray-100 text-gray-500',        // Xám - Đã hết
};

const PAGE_SIZE = 10;  // Số lượng lô hiển thị trên mỗi trang

export default function InventoryQC() {
  const { user } = useAuth();  // Lấy thông tin người dùng đang đăng nhập
  
  // Tab hiện tại: 'alert' = Cảnh báo, 'quarantine' = Cách ly
  const [activeTab, setActiveTab] = useState<Tab>('alert');
  
  // Danh sách tất cả lô hàng trong kho
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(true);
  
  // === State cho Tab Alert (Cảnh báo hết hạn) ===
  const [retestLot, setRetestLot] = useState<InventoryLot | null>(null);  // Lô đang thực hiện re-test
  const [retestAction, setRetestAction] = useState<'extend' | 'discard' | null>(null);  // Hành động: Gia hạn hoặc Hủy
  const [newExpiryDate, setNewExpiryDate] = useState('');  // Ngày hạn mới (nếu gia hạn)
  const [submitting, setSubmitting] = useState(false);  // Trạng thái đang gửi dữ liệu
  const [selectedItems, setSelectedItems] = useState<string[]>([]);  // Danh sách mã lô được chọn (cho bulk quarantine)
  const [searchLocation, setSearchLocation] = useState('');  // Tìm kiếm theo vị trí kho
  const [alertPage, setAlertPage] = useState(1);  // Phân trang tab Alert
  const [quarantinePage, setQuarantinePage] = useState(1);  // Phân trang tab Quarantine
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  /**
   * Tải tất cả lô hàng từ backend
   * Lấy danh sách lô để hiển thị cho cả 2 tab
   */
  const loadLots = useCallback(async () => {
    setLoading(true);
    try {
      // Gọi API lấy tất cả lô hàng trong kho
      const data = await getInventoryLots();
      console.log('Loaded inventory lots:', data);
      setLots(data);
    } catch {
      setToast({ message: 'Không thể tải dữ liệu kho', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Tự động tải dữ liệu khi component mount
  useEffect(() => {
    void loadLots();
  }, [loadLots]);

  // === Lọc dữ liệu cho Tab Cảnh báo (Alert) ===
  // Lọc các lô sắp hết hạn (còn ≤ 30 ngày và chưa hết hạn)
  const alertLots = lots.filter((lot) => {
    const days = getDaysUntilExpiry(lot.expiration_date);
    return days !== null && days <= 30 && days >= 0;
  });

  // Lọc các lô có thể cách ly (không ở trạng thái Quarantine hoặc Depleted)
  const quarantinableLots = lots.filter((l) => l.status !== 'Quarantine' && l.status !== 'Depleted');

  // Tìm kiếm theo vị trí kho (cho cả 2 tab)
  const filteredAlertLots = searchLocation.trim()
    ? alertLots.filter((lot) =>
        lot.storage_location?.toLowerCase().includes(searchLocation.trim().toLowerCase())
      )
    : alertLots;

  const filteredQuarantinableLots = searchLocation.trim()
    ? quarantinableLots.filter((lot) =>
        lot.storage_location?.toLowerCase().includes(searchLocation.trim().toLowerCase())
      )
    : quarantinableLots;

  // === Phân trang cho Tab Alert ===
  const alertTotalItems = filteredAlertLots.length;
  const alertTotalPages = Math.max(1, Math.ceil(alertTotalItems / PAGE_SIZE));
  const alertStart = (alertPage - 1) * PAGE_SIZE;
  const paginatedAlertLots = filteredAlertLots.slice(
    alertStart,
    alertStart + PAGE_SIZE,
  );
  const alertDisplayFrom = alertTotalItems === 0 ? 0 : alertStart + 1;
  const alertDisplayTo = Math.min(alertPage * PAGE_SIZE, alertTotalItems);

  // === Phân trang cho Tab Quarantine ===
  const quarantineTotalItems = filteredQuarantinableLots.length;
  const quarantineTotalPages = Math.max(
    1,
    Math.ceil(quarantineTotalItems / PAGE_SIZE),
  );
  const quarantineStart = (quarantinePage - 1) * PAGE_SIZE;
  const paginatedQuarantinableLots = filteredQuarantinableLots.slice(
    quarantineStart,
    quarantineStart + PAGE_SIZE,
  );
  const quarantineDisplayFrom = quarantineTotalItems === 0 ? 0 : quarantineStart + 1;
  const quarantineDisplayTo = Math.min(
    quarantinePage * PAGE_SIZE,
    quarantineTotalItems,
  );

  // Kiểm tra xem tất cả lô ở trang hiện tại của tab Quarantine có được chọn chưa
  const currentQuarantinePageLotIds = paginatedQuarantinableLots.map(
    (lot) => lot.lot_id,
  );
  const isCurrentQuarantinePageFullySelected =
    currentQuarantinePageLotIds.length > 0 &&
    currentQuarantinePageLotIds.every((id) => selectedItems.includes(id));

  // Điều chỉnh trang hiện tại nếu vượt quá tổng số trang
  useEffect(() => {
    if (alertPage > alertTotalPages) {
      setAlertPage(alertTotalPages);
    }
  }, [alertPage, alertTotalPages]);

  useEffect(() => {
    if (quarantinePage > quarantineTotalPages) {
      setQuarantinePage(quarantineTotalPages);
    }
  }, [quarantinePage, quarantineTotalPages]);

  // === Mở modal Re-test cho lô được chọn ===
  function openRetestModal(lot: InventoryLot) {
    setRetestLot(lot);
    setRetestAction(null);
    setNewExpiryDate('');
  }

  function closeRetestModal() {
    setRetestLot(null);
    setRetestAction(null);
    setNewExpiryDate('');
  }

  /**
   * Xử lý quyết định Re-test
   * - extend: Gia hạn lô (cần ngày hạn mới)
   * - discard: Hủy lô (đặt trạng thái Depleted, không thể hoàn tác)
   */
  async function handleRetest() {
    if (!retestLot || !retestAction) return;
    if (retestAction === 'extend' && !newExpiryDate) {
      setToast({ message: 'Vui lòng nhập ngày hạn sử dụng mới', type: 'error' });
      return;
    }
    setSubmitting(true);
    setModalError(null);
    try {
      // Gửi quyết định re-test lên backend
      await submitRetest(retestLot.lot_id, {
        action: retestAction,
        performed_by: user?.username ?? 'unknown_user',
        new_expiry_date: retestAction === 'extend' ? newExpiryDate : undefined,
      });
      setToast({
        message: retestAction === 'extend' ? `Đã gia hạn lô ${retestLot.lot_id}` : `Đã hủy lô ${retestLot.lot_id}`,
        type: 'success',
      });
      closeRetestModal();
      void loadLots();  // Tải lại dữ liệu
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Lỗi xử lý re-test', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // Chọn/bỏ chọn một lô trong danh sách
  function toggleSelect(lotId: string) {
    setSelectedItems((prev) =>
      prev.includes(lotId) ? prev.filter((id) => id !== lotId) : [...prev, lotId],
    );
  }

  /**
   * Cách ly hàng loạt (Bulk Quarantine)
   * Gửi danh sách các lô được chọn để chuyển sang trạng thái Quarantine
   */
  async function handleBulkQuarantine() {
    if (selectedItems.length === 0) {
      setToast({ message: 'Vui lòng chọn ít nhất một lô hàng', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await bulkQuarantine(selectedItems);
      setToast({ message: `Đã cách ly ${result.updated} lô hàng thành công`, type: 'success' });
      setSelectedItems([]);
      void loadLots();  // Tải lại dữ liệu
    } catch {
      setToast({ message: 'Không thể thực hiện cách ly', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }
  }, []);

  useEffect(() => {
    void loadLots();
  }, [loadLots]);

  // Filter lots expiring within 30 days
  const alertLots = lots.filter((lot) => {
    const days = getDaysUntilExpiry(lot.expiration_date);
    return days !== null && days <= 30 && days >= 0;
  });

  // All non-quarantine lots available for bulk quarantine (Accepted, Hold, etc.)
  const quarantinableLots = lots.filter((l) => l.status !== 'Quarantine' && l.status !== 'Depleted');

  const filteredAlertLots = searchLocation.trim()
    ? alertLots.filter((lot) =>
        lot.storage_location?.toLowerCase().includes(searchLocation.trim().toLowerCase())
      )
    : alertLots;

  const filteredQuarantinableLots = searchLocation.trim()
    ? quarantinableLots.filter((lot) =>
        lot.storage_location?.toLowerCase().includes(searchLocation.trim().toLowerCase())
      )
    : quarantinableLots;

  const alertTotalItems = filteredAlertLots.length;
  const alertTotalPages = Math.max(1, Math.ceil(alertTotalItems / PAGE_SIZE));
  const alertStart = (alertPage - 1) * PAGE_SIZE;
  const paginatedAlertLots = filteredAlertLots.slice(
    alertStart,
    alertStart + PAGE_SIZE,
  );
  const alertDisplayFrom = alertTotalItems === 0 ? 0 : alertStart + 1;
  const alertDisplayTo = Math.min(alertPage * PAGE_SIZE, alertTotalItems);

  const quarantineTotalItems = filteredQuarantinableLots.length;
  const quarantineTotalPages = Math.max(
    1,
    Math.ceil(quarantineTotalItems / PAGE_SIZE),
  );
  const quarantineStart = (quarantinePage - 1) * PAGE_SIZE;
  const paginatedQuarantinableLots = filteredQuarantinableLots.slice(
    quarantineStart,
    quarantineStart + PAGE_SIZE,
  );
  const quarantineDisplayFrom = quarantineTotalItems === 0 ? 0 : quarantineStart + 1;
  const quarantineDisplayTo = Math.min(
    quarantinePage * PAGE_SIZE,
    quarantineTotalItems,
  );

  const currentQuarantinePageLotIds = paginatedQuarantinableLots.map(
    (lot) => lot.lot_id,
  );
  const isCurrentQuarantinePageFullySelected =
    currentQuarantinePageLotIds.length > 0 &&
    currentQuarantinePageLotIds.every((id) => selectedItems.includes(id));

  useEffect(() => {
    if (alertPage > alertTotalPages) {
      setAlertPage(alertTotalPages);
    }
  }, [alertPage, alertTotalPages]);

  useEffect(() => {
    if (quarantinePage > quarantineTotalPages) {
      setQuarantinePage(quarantineTotalPages);
    }
  }, [quarantinePage, quarantineTotalPages]);

  function openRetestModal(lot: InventoryLot) {
    setRetestLot(lot);
    setRetestAction(null);
    setNewExpiryDate('');
  }

  function closeRetestModal() {
    setRetestLot(null);
    setRetestAction(null);
    setNewExpiryDate('');
  }

  async function handleRetest() {
    if (!retestLot || !retestAction) return;
    if (retestAction === 'extend' && !newExpiryDate) {
      setToast({ message: 'Vui lòng nhập ngày hạn sử dụng mới', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await submitRetest(retestLot.lot_id, {
        action: retestAction,
        performed_by: user?.username ?? 'unknown_user',
        new_expiry_date: retestAction === 'extend' ? newExpiryDate : undefined,
      });
      setToast({
        message: retestAction === 'extend' ? `Đã gia hạn lô ${retestLot.lot_id}` : `Đã hủy lô ${retestLot.lot_id}`,
        type: 'success',
      });
      closeRetestModal();
      void loadLots();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Lỗi xử lý re-test', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  function toggleSelect(lotId: string) {
    setSelectedItems((prev) =>
      prev.includes(lotId) ? prev.filter((id) => id !== lotId) : [...prev, lotId],
    );
  }

  async function handleBulkQuarantine() {
    if (selectedItems.length === 0) {
      setToast({ message: 'Vui lòng chọn ít nhất một lô hàng', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await bulkQuarantine(selectedItems);
      setToast({ message: `Đã cách ly ${result.updated} lô hàng thành công`, type: 'success' });
      setSelectedItems([]);
      void loadLots();
    } catch {
      setToast({ message: 'Không thể thực hiện cách ly', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Tiêu đề trang Quản lý kho QC */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Kiểm soát kho QC</h1>
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Kiểm định lại hàng sắp hết hạn & quản lý cách ly</p>
      </div>

      {/* Thanh công cụ: Tìm kiếm theo vị trí kho */}
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchLocation}
            onChange={(e) => {
              setSearchLocation(e.target.value);
              setAlertPage(1);
              setQuarantinePage(1);
              setSelectedItems([]);
            }}
            placeholder="Tìm theo vị trí kho..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Thanh Tab chuyển đổi giữa 2 chức năng chính */}
      <div className="flex border-b border-gray-200">
        {/* Tab Cảnh báo chất lượng - Hiển thị lô sắp hết hạn */}
        <button
          onClick={() => {
            setActiveTab('alert');
            setSearchLocation('');
            setAlertPage(1);
            setSelectedItems([]);
          }}
          className={`m-2 px-5 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
            activeTab === 'alert' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Cảnh báo chất lượng
          {/* Hiển thị badge số lượng lô cảnh báo */}
          {alertLots.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {alertLots.length}
            </span>
          )}
        </button>
        {/* Tab Cách ly hàng hóa */}
        <button
          onClick={() => {
            setActiveTab('quarantine');
            setSearchLocation('');
            setQuarantinePage(1);
          }}
          className={`m-2 px-5 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
            activeTab === 'quarantine' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Cách ly hàng hóa
        </button>
      </div>

      {/* === TAB CẢNH BÁO (Alert) - Lô sắp hết hạn ≤ 30 ngày === */}
      {activeTab === 'alert' && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredAlertLots.length === 0 ? (
            <p className="p-10 text-center text-gray-400">
              {searchLocation
                ? `Không có lô nào tại vị trí "${searchLocation}" sắp hết hạn`
                : 'Không có lô hàng nào sắp hết hạn trong 30 ngày tới.'}
            </p>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold tracking-wider">Mã lô</th>
                      <th className="px-6 py-4 text-left font-bold tracking-wider">Tên sản phẩm</th>
                      <th className="px-6 py-4 text-left font-bold tracking-wider">Vị trí</th>
                      <th className="px-6 py-4 text-left font-bold tracking-wider">Hạn sử dụng</th>
                      <th className="px-6 py-4 text-left font-bold tracking-wider">Cảnh báo</th>
                      <th className="px-6 py-4 text-left font-bold tracking-wider">Trạng thái</th>
                      <th className="px-6 py-4 text-left font-bold tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedAlertLots.map((lot) => {
                      const days = getDaysUntilExpiry(lot.expiration_date);
                      const isNearExpiry = days !== null && days <= 7;
                      return (
                        <tr key={lot.lot_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-mono font-medium text-gray-800">{lot.lot_id}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700">{lot.material_name}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500">{lot.storage_location ?? '—'}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700">
                            {lot.expiration_date ? new Date(lot.expiration_date).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isNearExpiry ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {isNearExpiry ? `Hết hạn sau (${days ?? 0} ngày)` : `Cần kiểm tra (${days ?? 0} ngày)`}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE[lot.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {lot.status === 'Quarantine' ? 'Cách ly' : lot.status === 'Accepted' ? 'Chấp nhận' : lot.status === 'Rejected' ? 'Từ chối' : lot.status === 'Hold' ? 'Tạm giữ' : lot.status === 'Depleted' ? 'Đã hết' : lot.status}
                              </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => openRetestModal(lot)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                            >
                              Kiểm tra lại
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Hiển thị {alertDisplayFrom}-{alertDisplayTo} / {alertTotalItems} lô hàng
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAlertPage((prev) => Math.max(1, prev - 1))}
                    disabled={alertPage === 1}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <span className="text-xs text-gray-500">
                    Trang {alertPage}/{alertTotalPages}
                  </span>
                  <button
                    onClick={() => setAlertPage((prev) => Math.min(alertTotalPages, prev + 1))}
                    disabled={alertPage === alertTotalPages}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quarantine Tab */}
      {activeTab === 'quarantine' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Chọn lô hàng cần chuyển sang trạng thái <span className="font-medium text-yellow-700">Chờ Kiểm Định</span>
            </p>
            <button
              onClick={() => void handleBulkQuarantine()}
              disabled={submitting || selectedItems.length === 0}
              className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 flex items-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              <Lock className="w-3.5 h-3.5" />
              Cách ly hàng loạt ({selectedItems.length})
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredQuarantinableLots.length === 0 ? (
              <p className="p-10 text-center text-gray-400">
                {searchLocation
                  ? `Không tìm thấy lô nào tại vị trí "${searchLocation}"`
                  : 'Không có lô hàng nào có thể cách ly.'}
              </p>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-6 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={isCurrentQuarantinePageFullySelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems((prev) => [
                                  ...prev,
                                  ...currentQuarantinePageLotIds.filter(
                                    (id) => !prev.includes(id),
                                  ),
                                ]);
                                return;
                              }

                              setSelectedItems((prev) =>
                                prev.filter(
                                  (id) => !currentQuarantinePageLotIds.includes(id),
                                ),
                              );
                            }}
                            className="rounded"
                          />
                        </th>
                        <th className="px-6 py-4 text-left font-bold tracking-wider">Mã lô</th>
                        <th className="px-6 py-4 text-left font-bold tracking-wider">Tên sản phẩm</th>
                        <th className="px-6 py-4 text-left font-bold tracking-wider">Nhà cung cấp</th>
                        <th className="px-6 py-4 text-left font-bold tracking-wider">Vị trí</th>
                        <th className="px-6 py-4 text-left font-bold tracking-wider">Trạng thái hiện tại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedQuarantinableLots.map((lot) => (
                        <tr key={lot.lot_id} className={`hover:bg-gray-50 ${selectedItems.includes(lot.lot_id) ? 'bg-red-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(lot.lot_id)}
                              onChange={() => toggleSelect(lot.lot_id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-gray-800">{lot.lot_id}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700">{lot.material_name}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500">{lot.supplier_name}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500">{lot.storage_location ?? '—'}</td>
                          <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE[lot.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {lot.status === 'Quarantine' ? 'Chờ kiểm định' : lot.status === 'Accepted' ? 'Chấp nhận' : lot.status === 'Rejected' ? 'Từ chối' : lot.status === 'Hold' ? 'Tạm giữ' : lot.status === 'Depleted' ? 'Đã hết' : lot.status}
                              </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Hiển thị {quarantineDisplayFrom}-{quarantineDisplayTo} / {quarantineTotalItems} lô hàng
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuarantinePage((prev) => Math.max(1, prev - 1))}
                      disabled={quarantinePage === 1}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <span className="text-xs text-gray-500">
                      Trang {quarantinePage}/{quarantineTotalPages}
                    </span>
                    <button
                      onClick={() => setQuarantinePage((prev) => Math.min(quarantineTotalPages, prev + 1))}
                      disabled={quarantinePage === quarantineTotalPages}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Re-test Modal */}
      {retestLot && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-blue-600 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-white" />
                <div>
                  <h2 className="text-base font-bold text-white">Re-test lô hàng</h2>
                  <p className="text-xs text-blue-200">{retestLot.lot_id} — {retestLot.material_name}</p>
                </div>
              </div>
              <button onClick={closeRetestModal} className="text-blue-200 hover:text-white transition p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                HSD: {retestLot.expiration_date ? new Date(retestLot.expiration_date).toLocaleDateString('vi-VN') : '—'}
                {getDaysUntilExpiry(retestLot.expiration_date) !== null &&
                  ` (còn ${getDaysUntilExpiry(retestLot.expiration_date)} ngày)`}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Chọn hành động</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRetestAction('extend')}
                    className={`p-3 rounded-lg border text-sm font-medium transition ${
                      retestAction === 'extend'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    ✓ GIA HẠN (Extend)
                  </button>
                  <button
                    onClick={() => setRetestAction('discard')}
                    className={`p-3 rounded-lg border text-sm font-medium transition ${
                      retestAction === 'discard'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    ✕ HỦY LÔ (Discard)
                  </button>
                </div>
              </div>

              {retestAction === 'extend' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ngày hạn sử dụng mới *</label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

              {retestAction === 'discard' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  ⚠️ Thao tác này sẽ đặt lô sang trạng thái <strong>Depleted</strong>. Không thể hoàn tác.
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button
                onClick={closeRetestModal}
                disabled={submitting}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => void handleRetest()}
                disabled={submitting || !retestAction || (retestAction === 'extend' && !newExpiryDate)}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {submitting ? 'Đang xử lý...' : 'XÁC NHẬN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
