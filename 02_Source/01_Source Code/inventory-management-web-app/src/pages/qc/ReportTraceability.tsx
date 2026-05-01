import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Search } from 'lucide-react';
import Toast from '../../components/Toast';
import { getQCTestsByLot, getSupplierPerformance, analyzeAllSuppliers, analyzeOneSupplier } from '../../services/qcServices';
import type { QCTest, SupplierPerformance, SupplierAnalysisResponse } from '../../types/qc';

type Tab = 'history' | 'supplier' | 'AI-analysis';

const RESULT_BADGE: Record<string, string> = {
  Pass: 'bg-green-100 text-green-700',
  Fail: 'bg-red-100 text-red-700',
  Pending: 'bg-amber-100 text-amber-700',
};

const SUPPLIER_PAGE_SIZE = 10;

export default function ReportTraceability() {
  const [activeTab, setActiveTab] = useState<Tab>('history');

  // History tab
  const [searchInput, setSearchInput] = useState('');
  const [qcHistory, setQcHistory] = useState<QCTest[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  // Supplier tab
  const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([]);
  const [supplierPage, setSupplierPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // AI Analysis tab state
  type AiMode = 'all' | 'single';
  const [aiMode, setAiMode] = useState<AiMode>('all');
  const [aiSupplierInput, setAiSupplierInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<SupplierAnalysisResponse | null>(null);

  const loadSuppliers = useCallback(async (from?: string, to?: string) => {
    setLoadingSuppliers(true);
    try {
      const data = await getSupplierPerformance(from, to);
      setSuppliers(data);
      setSupplierPage(1);
    } catch {
      setToast({ message: 'Không thể tải báo cáo nhà cung cấp', type: 'error' });
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  useEffect(() => {
    void loadSuppliers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // intentionally run once on mount; user triggers re-fetch via "Áp dụng" button

  async function handleSearch() {
    const lotId = searchInput.trim();
    if (!lotId) return;
    setSearching(true);
    try {
      const tests = await getQCTestsByLot(lotId);
      setQcHistory(tests);
      setSelectedLotId(lotId);
    } catch {
      setToast({ message: 'Không tìm thấy lô hàng hoặc không có lịch sử QC', type: 'error' });
      setQcHistory([]);
      setSelectedLotId(null);
    } finally {
      setSearching(false);
    }
  }

  // Derived supplier KPIs
  const bestSupplier = [...suppliers].sort((a, b) => b.quality_rate - a.quality_rate)[0];
  const worstSupplier = [...suppliers].sort((a, b) => a.quality_rate - b.quality_rate)[0];
  const totalBatches = suppliers.reduce((sum, s) => sum + s.total_batches, 0);
  const supplierTotalItems = suppliers.length;
  const supplierTotalPages = Math.max(1, Math.ceil(supplierTotalItems / SUPPLIER_PAGE_SIZE));
  const supplierStart = (supplierPage - 1) * SUPPLIER_PAGE_SIZE;
  const paginatedSuppliers = suppliers.slice(
    supplierStart,
    supplierStart + SUPPLIER_PAGE_SIZE,
  );
  const supplierDisplayFrom = supplierTotalItems === 0 ? 0 : supplierStart + 1;
  const supplierDisplayTo = Math.min(
    supplierPage * SUPPLIER_PAGE_SIZE,
    supplierTotalItems,
  );

  useEffect(() => {
    if (supplierPage > supplierTotalPages) {
      setSupplierPage(supplierTotalPages);
    }
  }, [supplierPage, supplierTotalPages]);

  async function handleAiAnalyze() {
    if (aiMode === 'single' && !aiSupplierInput.trim()) {
      setToast({ message: 'Vui lòng nhập tên nhà cung cấp', type: 'error' });
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const from = dateFrom || undefined;
      const to = dateTo || undefined;

      const result =
        aiMode === 'all'
          ? await analyzeAllSuppliers(from, to)
          : await analyzeOneSupplier(aiSupplierInput.trim(), from, to);
      setAiResult(result);
      if (!result.success) {
        setToast({ message: 'AI phân tích không thành công. Xem chi tiết trong kết quả.', type: 'error' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      setToast({ message, type: 'error' });
    } finally {
      setAiLoading(false);
    }
  }

  function exportCSV() {
    if (suppliers.length === 0) return;
    const header = 'Nhà cung cấp,Tổng lô,Đạt,Từ chối,Tỷ lệ đạt (%)';
    const rows = suppliers.map(
      (s) => `${s.supplier_name},${s.total_batches},${s.approved},${s.rejected},${s.quality_rate.toFixed(2)}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier_performance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  async function exportCOAPdf() {
    if (!selectedLotId) {
      setToast({ message: 'Vui lòng tìm và chọn lô hàng trước khi xuất COA', type: 'error' });
      return;
    }

    if (qcHistory.length === 0) {
      setToast({ message: 'Lô hàng chưa có dữ liệu QC để xuất COA', type: 'error' });
      return;
    }

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const generatedAt = new Date();
      const companyInfo = {
        name: import.meta.env.VITE_COMPANY_NAME || 'Inventory Management Co., Ltd.',
        address:
          import.meta.env.VITE_COMPANY_ADDRESS ||
          '123 Nguyen Van Linh, District 7, Ho Chi Minh City',
        hotline: import.meta.env.VITE_COMPANY_HOTLINE || '1900 1234',
        email: import.meta.env.VITE_COMPANY_EMAIL || 'qa@inventory.local',
        website: import.meta.env.VITE_COMPANY_WEBSITE || 'https://inventory.local',
        issuedBy: import.meta.env.VITE_COA_ISSUED_BY || 'QC Department',
      };

      const coaRows = qcHistory
        .map((test, idx) => {
          const date = test.test_date
            ? new Date(test.test_date).toLocaleDateString('vi-VN')
            : 'N/A';

          return `
            <tr>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${idx + 1}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(test.test_type ?? '')}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(test.test_method ?? '')}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(test.test_result ?? '')}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(test.result_status ?? '')}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(date)}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${escapeHtml(test.performed_by ?? '')}</td>
            </tr>
          `;
        })
        .join('');

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = '1000px';
      container.style.background = '#ffffff';
      container.style.padding = '24px';
      container.style.boxSizing = 'border-box';
      container.style.fontFamily = 'Arial, sans-serif';
      container.innerHTML = `
        <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">${escapeHtml(companyInfo.name)}</h2>
          <p style="margin: 2px 0; font-size: 12px; color: #374151;"><strong>Address:</strong> ${escapeHtml(companyInfo.address)}</p>
          <p style="margin: 2px 0; font-size: 12px; color: #374151;"><strong>Hotline:</strong> ${escapeHtml(companyInfo.hotline)} | <strong>Email:</strong> ${escapeHtml(companyInfo.email)}</p>
          <p style="margin: 2px 0; font-size: 12px; color: #374151;"><strong>Website:</strong> ${escapeHtml(companyInfo.website)}</p>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h1 style="margin: 0; font-size: 24px; color: #111827;">CERTIFICATE OF ANALYSIS (COA)</h1>
          <span style="font-size: 12px; color: #6b7280;">Generated: ${escapeHtml(generatedAt.toLocaleString('vi-VN'))}</span>
        </div>
        <div style="margin-bottom: 16px; font-size: 14px; color: #374151;">
          <p style="margin: 0 0 4px 0;"><strong>Lot ID:</strong> ${escapeHtml(selectedLotId)}</p>
          <p style="margin: 0;"><strong>Total QC Records:</strong> ${qcHistory.length}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #111827;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">#</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Test Type</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Method</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Result</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Status</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Date</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Performed By</th>
            </tr>
          </thead>
          <tbody>
            ${coaRows}
          </tbody>
        </table>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 12px; color: #374151;">
          <span><strong>Issued by:</strong> ${escapeHtml(companyInfo.issuedBy)}</span>
          <span><strong>Signature:</strong> ____________________</span>
        </div>
      `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`COA_${selectedLotId}_${generatedAt.toISOString().slice(0, 10)}.pdf`);
      setToast({ message: 'Xuất COA PDF thành công', type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      setToast({ message: `Không thể tạo PDF: ${message}`, type: 'error' });
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Truy vết & Báo cáo</h1>
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Lịch sử QC theo lô và hiệu suất nhà cung cấp</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('history')}
          className={`m-2 px-5 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
            activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Lịch sử QC
        </button>
        <button
          onClick={() => setActiveTab('supplier')}
          className={`m-2 px-5 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
            activeTab === 'supplier' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Hiệu suất Nhà CC
        </button>
        <button
          onClick={() => setActiveTab('AI-analysis')}
          className={`m-2 px-5 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
            activeTab === 'AI-analysis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Phân tích từ AI
        </button>
      </div>

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* Search bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
                placeholder="Nhập mã lô hàng (VD: LOT-001)..."
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <button
              onClick={() => void handleSearch()}
              disabled={searching || !searchInput.trim()}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              {searching && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              {searching ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
          </div>

          {/* Results */}
          {selectedLotId && (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">Lịch sử QC — Lô: <span className="font-mono text-blue-600">{selectedLotId}</span></h2>
                  <p className="text-xs text-gray-400 mt-0.5">{qcHistory.length} bản ghi kiểm nghiệm</p>
                </div>
                <button
                  onClick={() => void exportCOAPdf()}
                  className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50"
                >
                  🖨️ Xuất COA
                </button>
              </div>

              {qcHistory.length === 0 ? (
                <p className="p-8 text-center text-gray-400">Không có bản ghi QC nào cho lô này.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {qcHistory.map((test, idx) => (
                    <div key={test.test_id} className="px-5 py-4 flex gap-4">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center pt-1">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${
                          test.result_status === 'Pass' ? 'bg-green-500' :
                          test.result_status === 'Fail' ? 'bg-red-500' : 'bg-yellow-400'
                        }`} />
                        {idx < qcHistory.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200 mt-1 min-h-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-800 text-sm">{test.test_type}</span>
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${RESULT_BADGE[test.result_status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {test.result_status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{test.test_result}</p>
                            {test.acceptance_criteria && (
                              <p className="text-xs text-gray-400 mt-0.5">Tiêu chuẩn: {test.acceptance_criteria}</p>
                            )}
                            {test.reject_reason && (
                              <p className="text-xs text-red-500 mt-0.5">Lý do: {test.reject_reason}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-400">{new Date(test.test_date).toLocaleDateString('vi-VN')}</p>
                            <p className="text-xs text-gray-500 mt-0.5">By: {test.performed_by}</p>
                            {test.verified_by && (
                              <p className="text-xs text-gray-400">✓ {test.verified_by}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Phương pháp: {test.test_method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedLotId && (
            <div className="p-12 bg-white border border-dashed border-gray-200 rounded-xl text-center text-gray-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm">Nhập mã lô hàng để xem lịch sử kiểm nghiệm</p>
            </div>
          )}
        </div>
      )}

      {/* Supplier Tab */}
      {activeTab === 'supplier' && (
        <div className="space-y-5">
          {/* Date range filter */}
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Từ ngày</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Đến ngày</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => void loadSuppliers(dateFrom || undefined, dateTo || undefined)}
              disabled={loadingSuppliers}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loadingSuppliers && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              Áp dụng
            </button>
            <button
              onClick={exportCSV}
              disabled={suppliers.length === 0}
              className="px-4 py-2 border bg-green-500 border-gray-300 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              Xuất CSV
            </button>
          </div>

          {/* KPI summary cards */}
          {suppliers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs font-medium text-blue-500 uppercase">Tổng lô đã kiểm</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{totalBatches}</p>
                <p className="text-xs text-blue-400 mt-0.5">{suppliers.length} nhà cung cấp</p>
              </div>
              {bestSupplier && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs font-medium text-green-500 uppercase">Tốt nhất</p>
                  <p className="text-base font-bold text-green-700 mt-1 truncate">{bestSupplier.supplier_name}</p>
                  <p className="text-xs text-green-600">{bestSupplier.quality_rate.toFixed(1)}% đạt chuẩn</p>
                </div>
              )}
              {worstSupplier && worstSupplier.supplier_name !== bestSupplier?.supplier_name && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-medium text-red-500 uppercase">Cần cải thiện</p>
                  <p className="text-base font-bold text-red-700 mt-1 truncate">{worstSupplier.supplier_name}</p>
                  <p className="text-xs text-red-600">{worstSupplier.quality_rate.toFixed(1)}% đạt chuẩn</p>
                </div>
              )}
            </div>
          )}

          {/* Supplier table */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            {loadingSuppliers ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : suppliers.length === 0 ? (
              <p className="p-10 text-center text-gray-400">Không có dữ liệu nhà cung cấp trong khoảng thời gian này.</p>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-6 py-4 text-left font-bold tracking-wider">Nhà cung cấp</th>
                        <th className="px-6 py-4 text-right font-bold tracking-wider">Tổng lô</th>
                        <th className="px-6 py-4 text-right font-bold tracking-wider">Đạt</th>
                        <th className="px-6 py-4 text-right font-bold tracking-wider">Từ chối</th>
                        <th className="px-6 py-4 text-left font-bold tracking-wider">Chỉ số chất lượng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedSuppliers.map((s) => (
                        <tr key={s.supplier_name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-semibold text-gray-800">{s.supplier_name}</td>
                          <td className="px-6 py-4 text-right text-gray-700">{s.total_batches}</td>
                          <td className="px-6 py-4 text-right text-green-600 font-medium">{s.approved}</td>
                          <td className="px-6 py-4 text-right text-red-600 font-medium">{s.rejected}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 max-w-32 bg-gray-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    s.quality_rate >= 90 ? 'bg-green-500' :
                                    s.quality_rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(s.quality_rate, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-semibold min-w-10 ${
                                s.quality_rate >= 90 ? 'text-green-600' :
                                s.quality_rate >= 70 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {s.quality_rate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Hiển thị {supplierDisplayFrom}-{supplierDisplayTo} / {supplierTotalItems} nhà cung cấp
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSupplierPage((prev) => Math.max(1, prev - 1))}
                      disabled={supplierPage === 1}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <span className="text-xs text-gray-500">
                      Trang {supplierPage}/{supplierTotalPages}
                    </span>
                    <button
                      onClick={() => setSupplierPage((prev) => Math.min(supplierTotalPages, prev + 1))}
                      disabled={supplierPage === supplierTotalPages}
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

      {/* AI Analysis Tab */}
      {activeTab === 'AI-analysis' && (
        <div className="space-y-5">
          {/* Mode card */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <h3 className="font-bold text-gray-900">Phân tích nhà cung cấp bằng AI</h3>
                <p className="text-xs text-gray-400">Sử dụng dữ liệu QC test thực tế để đánh giá rủi ro</p>
              </div>
            </div>

            {/* Mode selector */}
            <div className="flex gap-3">
              <button
                onClick={() => setAiMode('all')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-semibold transition ${
                  aiMode === 'all'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                📊 Tất cả nhà cung cấp
              </button>
              <button
                onClick={() => setAiMode('single')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-semibold transition ${
                  aiMode === 'single'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                🔍 Theo tên nhà cung cấp
              </button>
            </div>

            {/* Single supplier input */}
            {aiMode === 'single' && (
              <input
                type="text"
                value={aiSupplierInput}
                onChange={(e) => setAiSupplierInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAiAnalyze(); }}
                placeholder="Nhập tên nhà cung cấp (VD: Công ty ABC)..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
            )}

            {/* Date range filter */}
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-gray-400 pb-2">Bỏ trống để phân tích toàn bộ dữ liệu</p>
            </div>

            {/* Analyze button */}
            <button
              onClick={() => void handleAiAnalyze()}
              disabled={aiLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
            >
              {aiLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Đang phân tích...
                </>
              ) : (
                <>🤖 Phân tích với AI</>
              )}
            </button>
          </div>

          {/* Result card */}
          {aiResult && (
            <div className={`bg-white border rounded-xl shadow-sm overflow-hidden ${
              aiResult.success ? 'border-gray-100' : 'border-red-200'
            }`}>
              {/* Result header */}
              <div className={`px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2 ${
                aiResult.success ? 'border-gray-100 bg-gray-50' : 'border-red-100 bg-red-50'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    aiResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {aiResult.success ? '✓ Thành công' : '✕ Lỗi'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Đã phân tích: <strong>{aiResult.suppliers_analyzed}</strong> nhà cung cấp
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>Model: <span className="font-mono">{aiResult.model_used.split('/').pop()}</span></span>
                  <span>{new Date(aiResult.timestamp).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {/* Analysis content */}
              <div className="px-5 py-4 prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{aiResult.analysis}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!aiResult && !aiLoading && (
            <div className="p-12 bg-white border border-dashed border-gray-200 rounded-xl text-center text-gray-400">
              <div className="text-4xl mb-3">🤖</div>
              <p className="text-sm font-medium">Chưa có kết quả phân tích</p>
              <p className="text-xs mt-1">Chọn chế độ và nhấn "Phân tích với AI" để bắt đầu</p>
            </div>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
