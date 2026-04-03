import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, X, Search } from 'lucide-react';
import Toast from '../../components/Toast';
import {
  getInventoryLots,
  createQCTest,
  submitLotDecision,
} from '../../services/qcServices';
import type {
  InventoryLot,
  CreateQCTestDto,
  LotDecisionDto,
} from '../../types/qc';

type StatusFilter = 'all' | 'Quarantine' | 'Accepted' | 'Rejected' | 'Hold';
type DecisionValue = 'approved' | 'rejected' | 'hold';

const STATUS_MAP: Record<StatusFilter, string | undefined> = {
  all: undefined,
  Quarantine: 'Quarantine',
  Accepted: 'Accepted',
  Rejected: 'Rejected',
  Hold: 'Hold',
};

const DECISION_MAP: Record<DecisionValue, LotDecisionDto['decision']> = {
  approved: 'Accepted',
  rejected: 'Rejected',
  hold: 'Hold',
};

const STATUS_BADGE: Record<string, string> = {
  Quarantine: 'bg-amber-100 text-amber-700',
  Accepted: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Hold: 'bg-purple-100 text-purple-700',
  Depleted: 'bg-gray-100 text-gray-500',
};

interface InspectionForm {
  testType: CreateQCTestDto['test_type'];
  testMethod: string;
  moisture: string;
  purity: string;
  sensory: string;
  decision: DecisionValue;
  rejectReason: string;
  label: string;
}

const DEFAULT_FORM: InspectionForm = {
  testType: 'Physical',
  testMethod: 'USP Standard',
  moisture: '',
  purity: '',
  sensory: '',
  decision: 'approved',
  rejectReason: '',
  label: '',
};

export default function InboundControl() {
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('Quarantine');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLot, setSelectedLot] = useState<InventoryLot | null>(null);
  const [form, setForm] = useState<InspectionForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadLots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventoryLots(STATUS_MAP[filterStatus]);
      console.log('Fetched lots:', data);
      setLots(data);
    } catch {
      setToast({ message: 'Không thể tải danh sách lô hàng', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    void loadLots();
  }, [loadLots]);

  const displayedLots = searchQuery.trim()
    ? lots.filter((lot) =>
        lot.material_name?.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : lots;

  function openModal(lot: InventoryLot) {
    setSelectedLot(lot);
    setForm(DEFAULT_FORM);
    setModalError(null);
  }

  function closeModal() {
    setSelectedLot(null);
    setModalError(null);
  }

  // Auto-determine pass/fail based on moisture ≤ 5% and purity ≥ 98%
  function isAutoPass(f: InspectionForm): boolean {
    const m = parseFloat(f.moisture);
    const p = parseFloat(f.purity);
    if (isNaN(m) || isNaN(p)) return false;
    return m <= 5.0 && p >= 98.0;
  }

  async function handleSubmit() {
    if (!selectedLot) return;
    if (!form.moisture || !form.purity || !form.sensory) {
      setModalError('Vui lòng nhập đầy đủ kết quả kiểm nghiệm');
      return;
    }
    if (form.decision === 'rejected' && !form.rejectReason.trim()) {
      setModalError('Vui lòng nhập lý do từ chối');
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      const pass = isAutoPass(form);
      const testDto: CreateQCTestDto = {
        lot_id: selectedLot.lot_id,
        test_type: form.testType,
        test_method: form.testMethod || 'USP Standard',
        test_date: new Date().toISOString().split('T')[0],
        test_result: `Độ ẩm: ${form.moisture}%, Tinh khiết: ${form.purity}%, Cảm quan: ${form.sensory}`,
        acceptance_criteria: 'Độ ẩm ≤ 5%, Tinh khiết ≥ 98%',
        result_status: form.decision === 'hold' ? 'Pending' : pass ? 'Pass' : 'Fail',
        performed_by: 'qc_user',
        reject_reason: form.decision === 'rejected' ? form.rejectReason : undefined,
        label_id: form.label || undefined,
      };
      await createQCTest(testDto);

      const decisionDto: LotDecisionDto = {
        decision: DECISION_MAP[form.decision],
        verified_by: 'qc_user',
        reject_reason: form.decision === 'rejected' ? form.rejectReason : undefined,
        label_id: form.label || undefined,
      };
      await submitLotDecision(selectedLot.lot_id, decisionDto);

      setToast({ message: `Đã cập nhật lô ${selectedLot.lot_id} thành công`, type: 'success' });
      closeModal();
      void loadLots();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Lỗi khi gửi kết quả');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Kiểm định lô đầu vào</h1>
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Kiểm định chất lượng nguyên liệu nhập từ nhà cung cấp</p>
      </div>

      {/* Toolbar: Search + Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên sản phẩm..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as StatusFilter);
            setSearchQuery('');
          }}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tất cả</option>
          <option value="Quarantine">Chờ kiểm định</option>
          <option value="Accepted">Chấp nhận</option>
          <option value="Rejected">Từ chối</option>
          <option value="Hold">Tạm giữ</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : displayedLots.length === 0 ? (
          <p className="p-10 text-center text-gray-400">
            {searchQuery ? `Không tìm thấy sản phẩm "${searchQuery}"` : 'Không có lô hàng nào'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Mã lô</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Tên sản phẩm</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Nhà cung cấp</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Số lượng</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Hạn sử dụng</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedLots.map((lot) => (
                  <tr key={lot.lot_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-medium text-gray-800">{lot.lot_id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{lot.material_name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{lot.supplier_name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{lot.quantity} {lot.unit_of_measure ?? ''}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">
                      {lot.expiration_date ? new Date(lot.expiration_date).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE[lot.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {lot.status === 'Quarantine' ? 'Chờ kiểm định' : lot.status === 'Accepted' ? 'Chấp nhận' : lot.status === 'Rejected' ? 'Từ chối' : lot.status === 'Hold' ? 'Tạm giữ' : lot.status === 'Depleted' ? 'Đã hết' : lot.status}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                      {lot.status === 'Quarantine' && (
                        <button
                          onClick={() => openModal(lot)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                        >
                          Tiến hành kiểm định
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspection Modal */}
      {selectedLot && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-blue-600 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-5 h-5 text-white" />
                <div>
                  <h2 className="text-base font-bold text-white">Kiểm định lô hàng</h2>
                  <p className="text-xs text-blue-200">{selectedLot.lot_id} — {selectedLot.material_name}</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-blue-200 hover:text-white transition p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Lot info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                <div><span className="text-gray-400">Nhà cung cấp:</span> <span className="font-medium">{selectedLot.supplier_name}</span></div>
                <div><span className="text-gray-400">Số lượng:</span> <span className="font-medium">{selectedLot.quantity} {selectedLot.unit ?? ''}</span></div>
                <div><span className="text-gray-400">Vị trí:</span> <span className="font-medium">{selectedLot.location ?? '—'}</span></div>
                <div><span className="text-gray-400">HSD:</span> <span className="font-medium">{selectedLot.expiration_date ? new Date(selectedLot.expiration_date).toLocaleDateString('vi-VN') : '—'}</span></div>
              </div>

              {/* Test type & method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loại kiểm tra *</label>
                  <select
                    value={form.testType}
                    onChange={(e) => setForm({ ...form, testType: e.target.value as CreateQCTestDto['test_type'] })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {(['Identity', 'Potency', 'Microbial', 'Growth Promotion', 'Physical', 'Chemical'] as const).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phương pháp</label>
                  <input
                    type="text"
                    value={form.testMethod}
                    onChange={(e) => setForm({ ...form, testMethod: e.target.value })}
                    placeholder="VD: USP <905>"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Test results */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Kết quả kiểm nghiệm</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Độ ẩm (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.moisture}
                      onChange={(e) => setForm({ ...form, moisture: e.target.value })}
                      placeholder="≤ 5.0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tinh khiết (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.purity}
                      onChange={(e) => setForm({ ...form, purity: e.target.value })}
                      placeholder="≥ 98.0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cảm quan *</label>
                    <input
                      type="text"
                      value={form.sensory}
                      onChange={(e) => setForm({ ...form, sensory: e.target.value })}
                      placeholder="Bình thường"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                {/* Auto pass/fail indicator */}
                {form.moisture && form.purity && (
                  <div className={`mt-2 text-xs px-3 py-1.5 rounded ${isAutoPass(form) ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {isAutoPass(form) ? '✓ Kết quả đạt tiêu chuẩn tự động' : '✕ Vượt ngưỡng giới hạn cho phép'}
                  </div>
                )}
              </div>

              {/* Decision */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Quyết định QC</p>
                <div className="flex gap-2">
                  {(['approved', 'rejected', 'hold'] as DecisionValue[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setForm({ ...form, decision: d })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                        form.decision === d
                          ? d === 'approved' ? 'bg-green-600 text-white border-green-600'
                            : d === 'rejected' ? 'bg-red-600 text-white border-red-600'
                            : 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {d === 'approved' ? 'Chấp nhận' : d === 'rejected' ? 'Từ chối' : 'Tạm giữ'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reject reason */}
              {form.decision === 'rejected' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lý do từ chối *</label>
                  <textarea
                    value={form.rejectReason}
                    onChange={(e) => setForm({ ...form, rejectReason: e.target.value })}
                    rows={2}
                    placeholder="Mô tả lý do từ chối..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  />
                </div>
              )}

              {/* Label */}
              {form.decision === 'approved' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mã nhãn (tùy chọn)</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="VD: LBL-2026-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

              {/* Error */}
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {modalError}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {submitting ? 'Đang xử lý...' : 'XÁC NHẬN & CẬP NHẬT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
