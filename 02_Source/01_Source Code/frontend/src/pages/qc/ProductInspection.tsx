
import { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import Toast from '../../components/Toast';
import { createQCTest, submitLotDecision } from '../../services/qcServices';
import { fetchProductionBatches } from '../../services/productionBatchService';
import type { CreateQCTestDto, LotDecisionDto } from '../../types/qc';
import type { ProductionBatch } from '../../types/production';


type DecisionValue = 'approved' | 'rejected' | 'hold';

interface InspectionForm {
  testType: CreateQCTestDto['test_type'];
  testMethod: string;
  appearance: string;
  purity: string;
  microbial: string;
  decision: DecisionValue;
  rejectReason: string;
  productLabel: string;
}

const DEFAULT_FORM: InspectionForm = {
  testType: 'Physical',
  testMethod: '',
  appearance: '',
  purity: '',
  microbial: '',
  decision: 'approved',
  rejectReason: '',
  productLabel: '',
};

export default function ProductInspection() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [form, setForm] = useState<InspectionForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadBatches() {
      try {
        const response = await fetchProductionBatches();
        setBatches(response.data);
      } catch {
        setToast({ message: 'Không thể tải danh sách lô sản xuất', type: 'error' });
      }
    }
    loadBatches();
  }, []);

  function openModal(batch: ProductionBatch) {
    setSelectedBatch(batch);
    setForm(DEFAULT_FORM);
    setModalError(null);
  }

  function closeModal() {
    setSelectedBatch(null);
    setModalError(null);
  }

  async function handleSubmit() {
    if (!selectedBatch) return;
    if (!form.appearance || !form.purity || !form.microbial) {
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
      const resultStatus: CreateQCTestDto['result_status'] =
        form.decision === 'approved' ? 'Pass' : form.decision === 'rejected' ? 'Fail' : 'Pending';

      const testDto: CreateQCTestDto = {
        lot_id: selectedBatch.batch_number,
        test_type: form.testType,
        test_method: form.testMethod || 'BP Standard',
        test_date: new Date().toISOString().split('T')[0],
        test_result: `Ngoại quan: ${form.appearance}, Tinh khiết: ${form.purity}%, Vi sinh: ${form.microbial}`,
        result_status: resultStatus,
        performed_by: 'qc_user',
        reject_reason: form.decision === 'rejected' ? form.rejectReason : undefined,
        label_id: form.productLabel || undefined,
      };
      await createQCTest(testDto);

      const decisionDto: LotDecisionDto = {
        decision: form.decision === 'approved' ? 'Accepted' : form.decision === 'rejected' ? 'Rejected' : 'Hold',
        verified_by: 'qc_user',
        reject_reason: form.decision === 'rejected' ? form.rejectReason : undefined,
        label_id: form.productLabel || undefined,
      };
      await submitLotDecision(selectedBatch.batch_number, decisionDto);

      setToast({ message: `Đã xử lý lô ${selectedBatch.batch_number} thành công`, type: 'success' });
      setBatches(batches.filter((b) => b.batch_number !== selectedBatch.batch_number));
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Lỗi khi gửi kết quả');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Kiểm định lô thành phẩm</h1>
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Kiểm tra chất lượng lô sản phẩm từ dây chuyền sản xuất</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {batches.length === 0 ? (
          <p className="p-10 text-center text-gray-400">Không có lô thành phẩm nào cần kiểm định.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Mã lô hàng</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Mã sản phẩm</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Ngày sản xuất</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Số lượng</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Dây chuyền</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.map((batch) => (
                  <tr key={batch.batch_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-medium text-gray-800">{batch.batch_number}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{batch.product_id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{new Date(batch.created_date).toLocaleDateString('vi-VN')}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{batch.batch_size} {batch.unit_of_measure}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{batch.status}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openModal(batch)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                      >
                        Tiến hành kiểm định
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspection Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-blue-600 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-white" />
                <div>
                  <h2 className="text-base font-bold text-white">Kiểm định thành phẩm</h2>
                  <p className="text-xs text-blue-200">{selectedBatch.batch_number} — {selectedBatch.product_id}</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-blue-200 hover:text-white transition p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Batch info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                <div><span className="text-gray-400">Ngày sản xuất:</span> <span className="font-medium">{new Date(selectedBatch.created_date).toLocaleDateString('vi-VN')}</span></div>
                <div><span className="text-gray-400">Số lượng:</span> <span className="font-medium">{selectedBatch.batch_size} {selectedBatch.unit_of_measure}</span></div>
                <div><span className="text-gray-400">Trạng thái:</span> <span className="font-medium">{selectedBatch.status}</span></div>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phương pháp *</label>
                  <input
                    type="text"
                    value={form.testMethod}
                    onChange={(e) => setForm({ ...form, testMethod: e.target.value })}
                    placeholder="VD: USP <61>, BP 2022"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Results */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Kết quả kiểm nghiệm</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ngoại quan *</label>
                    <input
                      type="text"
                      value={form.appearance}
                      onChange={(e) => setForm({ ...form, appearance: e.target.value })}
                      placeholder="VD: Màu trắng sữa, không nứt vỡ"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                      <label className="block text-xs text-gray-500 mb-1">Vi sinh *</label>
                      <input
                        type="text"
                        value={form.microbial}
                        onChange={(e) => setForm({ ...form, microbial: e.target.value })}
                        placeholder="VD: Đạt USP <61>"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
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

              {form.decision === 'rejected' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lý do từ chối *</label>
                  <textarea
                    value={form.rejectReason}
                    onChange={(e) => setForm({ ...form, rejectReason: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  />
                </div>
              )}

              {form.decision === 'approved' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nhãn sản phẩm (tùy chọn)</label>
                  <input
                    type="text"
                    value={form.productLabel}
                    onChange={(e) => setForm({ ...form, productLabel: e.target.value })}
                    placeholder="VD: LBL-PRD-2026-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

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
                {submitting ? 'Đang xử lý...' : 'XÁC NHẬN KIỂM ĐỊNH'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
