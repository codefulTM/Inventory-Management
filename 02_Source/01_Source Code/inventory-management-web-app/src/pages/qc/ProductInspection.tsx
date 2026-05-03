
/**
 * ProductInspection - Trang kiểm định thành phẩm dành cho QC Technician
 * ==============================================================
 * Chức năng chính:
 * - Hiển thị danh sách các lô sản xuất (Production Batches) để kiểm định
 * - Lọc theo trạng thái lô: In Progress, Complete, On Hold, Cancelled
 * - Thực hiện kiểm nghiệm trên lô thành phẩm: độ tinh khiết, vi sinh, cảm quan
 * - Đưa ra quyết định QC: Approved (đạt), Rejected (từ chối), Hold (tạm giữ)
 * - Tự động sinh nhãn (Product Label) khi lô được Approved
 * 
 * Quy trình kiểm định thành phẩm:
 * 1. QC chọn lô sản xuất đã hoàn thành (Complete) để kiểm tra
 * 2. Nhập kết quả kiểm nghiệm: loại kiểm (test_type), phương pháp (test_method)
 * 3. Đánh giá: ngoại quan (appearance), độ tinh khiết (purity), vi sinh (microbial)
 * 4. Đưa ra quyết định: Approved / Rejected / Hold
 * 5. Nếu Rejected: Nhập lý do từ chối
 * 6. Nếu Approved: Hệ thống tự động sinh mã nhãn cho thành phẩm
 * 
 * Các loại kiểm nghiệm (Test Types):
 * - Physical: Kiểm tra lý tính (màu sắc, hình dáng, độ rơi rã)
 * - Chemical: Phân tích hóa học (hàm lượng hoạt chất, tạp chất)
 * - Microbial: Kiểm tra vi sinh (tổng số vi khuẩn, E.coli, Salmonella)
 * - Stability: Kiểm tra độ ổn định (thời gian hết hạn thực tế)
 * 
 * Quyền truy cập: Chỉ Quality Control Technician (/qc/*)
 */

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import Toast from '../../components/Toast';
import { createQCTest, submitLotDecision } from '../../services/qcServices';
import { fetchProductionBatches } from '../../services/productionBatchService';
import type { CreateQCTestDto, LotDecisionDto } from '../../types/qc';
import type { PaginatedProductionBatch, ProductionBatch } from '../../types/production';

/**
 * Các quyết định QC có thể đưa ra sau khi kiểm định
 * - approved: Chấp nhận lô hàng (đạt chuẩn)
 * - rejected: Từ chối lô hàng (không đạt chuẩn)
 * - hold: Tạm giữ lô hàng (cần kiểm tra thêm)
 */
type DecisionValue = 'approved' | 'rejected' | 'hold';

/**
 * Form kiểm định thành phẩm
 * Chứa tất cả thông tin cần thiết để QC thực hiện kiểm nghiệm lô thành phẩm
 */
interface InspectionForm {
  testType: CreateQCTestDto['test_type'];  // Loại kiểm tra: Physical, Chemical, Microbial, etc.
  testMethod: string;                         // Phương pháp kiểm nghiệm (VD: USP <61>, BP 2022)
  appearance: string;                          // Kết quả ngoại quan (màu sắc, hình dáng, ...)
  purity: string;                              // Độ tinh khiết (%)
  microbial: string;                           // Kết quả vi sinh
  decision: DecisionValue;                      // Quyết định của QC
  rejectReason: string;                         // Lý do từ chối (nếu decision = 'rejected')
  productLabel: string;                         // Mã nhãn sản phẩm (nếu được chấp nhận)
}

/**
 * Form mặc định khi mở modal kiểm định
 * Mặc định: kiểm tra Physical, quyết định Approved
 */
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

// Số lượng lô hiển thị trên mỗi trang
const PAGE_SIZE = 10;

/**
 * ProductInspection Component - Kiểm định lô thành phẩm
 * 
 * Quy trình kiểm định:
 * 1. Hiển thị danh sách lô thành phẩm từ dây chuyền sản xuất
 * 2. QC chọn một lô → Mở modal kiểm định
 * 3. Nhập kết quả: Ngoại quan, Tinh khiết (%), Vi sinh
 * 4. Chọn quyết định: Chấp nhận (Approved) / Từ chối (Rejected) / Tạm giữ (Hold)
 * 5. Gửi kết quả QC test + Quyết định lô lên backend
 * 
 * form: Chứa thông tin kiểm nghiệm và quyết định của QC
 */
export default function ProductInspection() {
  // Danh sách lô thành phẩm từ dây chuyền sản xuất
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);  // Trạng thái đang tải danh sách
  
  // Phân trang danh sách lô
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginatedProductionBatch['pagination']>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  
  // Lô hàng đang được chọn để kiểm định
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  
  // Form kiểm định - Chứa kết quả và quyết định
  const [form, setForm] = useState<InspectionForm>(DEFAULT_FORM);
  
  // Trạng thái gửi dữ liệu và lỗi
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Thông báo toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  /**
   * Tải danh sách lô sản xuất từ backend
   * Lấy các lô từ dây chuyền sản xuất để QC kiểm định
   */
  const loadBatches = useCallback(async (page: number) => {
    setLoadingBatches(true);
    try {
      const response = await fetchProductionBatches(page, PAGE_SIZE);
      setBatches(response.data);
      setPagination(response.pagination);
    } catch {
      setToast({ message: 'Không thể tải danh sách lô sản xuất', type: 'error' });
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    void loadBatches(currentPage);
  }, [currentPage, loadBatches]);

  const displayFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const displayTo = Math.min(pagination.page * pagination.limit, pagination.total);

  function openModal(batch: ProductionBatch) {
    setSelectedBatch(batch);
    setForm(DEFAULT_FORM);
    setModalError(null);
  }

  function closeModal() {
    setSelectedBatch(null);
    setModalError(null);
  }

  /**
   * Xử lý gửi kết quả kiểm định lên backend
   * 
   * Quy trình:
   * 1. Kiểm tra dữ liệu đầu vào (đầy đủ kết quả, lý do từ chối nếu từ chối)
   * 2. Xác định trạng thái kết quả: Pass (đạt) / Fail (không đạt) / Pending (tạm giữ)
   * 3. Tạo QC Test record qua API createQCTest
   * 4. Gửi quyết định lô qua API submitLotDecision (Accept/Reject/Hold)
   * 5. Cập nhật lại danh sách lô và đóng modal
   */
  async function handleSubmit() {
    if (!selectedBatch) return;
    
    // Kiểm tra bắt buộc: Phải nhập đủ kết quả ngoại quan, tinh khiết, vi sinh
    if (!form.appearance || !form.purity || !form.microbial) {
      setModalError('Vui lòng nhập đầy đủ kết quả kiểm nghiệm');
      return;
    }
    
    // Nếu từ chối lô thì bắt buộc phải có lý do
    if (form.decision === 'rejected' && !form.rejectReason.trim()) {
      setModalError('Vui lòng nhập lý do từ chối');
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      // Xác định trạng thái kết quả dựa trên quyết định của QC
      // - approved → Pass (đạt)
      // - rejected → Fail (không đạt)
      // - hold → Pending (chờ xử lý)
      const resultStatus: CreateQCTestDto['result_status'] =
        form.decision === 'approved' ? 'Pass' : form.decision === 'rejected' ? 'Fail' : 'Pending';

      // Tạo DTO cho QC Test - Ghi nhận kết quả kiểm nghiệm
      const testDto: CreateQCTestDto = {
        lot_id: selectedBatch.batch_number,    // Mã lô thành phẩm
        test_type: form.testType,              // Loại kiểm tra (Physical, Chemical, etc.)
        test_method: form.testMethod || 'BP Standard',  // Phương pháp kiểm nghiệm
        test_date: new Date().toISOString().split('T')[0],  // Ngày kiểm tra
        // Tổng hợp kết quả kiểm nghiệm thành chuỗi
        test_result: `Ngoại quan: ${form.appearance}, Tinh khiết: ${form.purity}%, Vi sinh: ${form.microbial}`,
        result_status: resultStatus,           // Pass/Fail/Pending
        performed_by: 'qc_user',              // Người thực hiện (thực tế lấy từ auth)
        reject_reason: form.decision === 'rejected' ? form.rejectReason : undefined,
        label_id: form.productLabel || undefined,  // Mã nhãn (nếu chấp nhận)
      };
      // Gọi API tạo QC Test record
      await createQCTest(testDto);

      // Tạo DTO cho quyết định lô - Cập nhật trạng thái lô
      const decisionDto: LotDecisionDto = {
        decision: form.decision === 'approved' ? 'Accepted' : form.decision === 'rejected' ? 'Rejected' : 'Hold',
        verified_by: 'qc_user',
        reject_reason: form.decision === 'rejected' ? form.rejectReason : undefined,
        label_id: form.productLabel || undefined,
      };
      // Gọi API cập nhật quyết định lô
      await submitLotDecision(selectedBatch.batch_number, decisionDto);

      // Hiển thị thông báo thành công và làm mới dữ liệu
      setToast({ message: `Đã xử lý lô ${selectedBatch.batch_number} thành công`, type: 'success' });
      await loadBatches(currentPage);
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Lỗi khi gửi kết quả');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Tiêu đề trang kiểm định lô thành phẩm */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Kiểm định lô thành phẩm</h1>
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Kiểm tra chất lượng lô sản phẩm từ dây chuyền sản xuất</p>
      </div>

      {/* Bảng danh sách lô thành phẩm từ dây chuyền sản xuất */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {loadingBatches ? (
          // Hiển thị loading skeleton khi đang tải dữ liệu
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          // Hiển thị thông báo khi không có lô nào
          <p className="p-10 text-center text-gray-400">Không có lô thành phẩm nào cần kiểm định.</p>
        ) : (
          <div>
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
                        {/* Nút mở modal kiểm định cho lô này */}
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

            {/* Phân trang danh sách lô */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Hiển thị {displayFrom}-{displayTo} / {pagination.total} lô sản xuất
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-xs text-gray-500">
                  Trang {pagination.page}/{pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  disabled={currentPage >= pagination.totalPages}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal kiểm định thành phẩm - Nơi QC nhập kết quả và đưa ra quyết định */}
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
              {/* Hiển thị thông tin cơ bản của lô thành phẩm */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                <div><span className="text-gray-400">Ngày sản xuất:</span> <span className="font-medium">{new Date(selectedBatch.created_date).toLocaleDateString('vi-VN')}</span></div>
                <div><span className="text-gray-400">Số lượng:</span> <span className="font-medium">{selectedBatch.batch_size} {selectedBatch.unit_of_measure}</span></div>
                <div><span className="text-gray-400">Trạng thái:</span> <span className="font-medium">{selectedBatch.status}</span></div>
              </div>

              {/* Chọn loại kiểm tra và phương pháp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loại kiểm tra *</label>
                  <select
                    value={form.testType}
                    onChange={(e) => setForm({ ...form, testType: e.target.value as CreateQCTestDto['test_type'] })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {/* Các loại kiểm tra: Identity, Potency, Microbial, etc. */}
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

              {/* Nhập kết quả kiểm nghiệm - 3 chỉ tiêu chính */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Kết quả kiểm nghiệm</p>
                <div className="space-y-3">
                  {/* Ngoại quan: Kiểm tra màu sắc, hình dáng, ... */}
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
                    {/* Độ tinh khiết: Tỷ lệ % tinh khiết */}
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
                    {/* Vi sinh: Kết quả kiểm tra vi sinh vật */}
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

              {/* Quyết định QC - Chấp nhận/Từ chối/Tạm giữ */}
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

              {/* Lý do từ chối - Chỉ hiển thị khi chọn Từ chối */}
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

              {/* Mã nhãn sản phẩm - Chỉ hiển thị khi Chấp nhận */}
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

              {/* Hiển thị lỗi nếu có */}
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {modalError}
                </div>
              )}
            </div>

            {/* Nút hành động: Hủy hoặc Xác nhận kiểm định */}
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
                {/* Hiển thị loading spinner khi đang xử lý */}
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

      {/* Toast thông báo kết quả */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
