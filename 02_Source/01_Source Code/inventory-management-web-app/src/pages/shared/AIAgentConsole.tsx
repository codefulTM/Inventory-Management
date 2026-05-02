/**
 * AI Agent Console - Bảng điều khiển AI Agent
 * ============================================
 * Chức năng chính:
 * - Giao diện tương tác với hệ thống AI Agent đa chuyên gia (Multi-Agent System)
 * - Sử dụng kiến trúc Supervisor Pattern: 
 *   + SupervisorAgent: Định tuyến yêu cầu đến chuyên gia phù hợp
 *   + InventoryAnalystAgent: Phân tích tồn kho, xuất nhập kho
 *   + WarehouseOperatorAgent: Hỗ trợ vận hành kho bãi
 *   + QcComplianceCheckerAgent: Kiểm tra tuân thủ QC
 * 
 * Tính năng:
 * - Nhập prompt tự do hoặc chọn gợi ý nhanh (preset prompts)
 * - Chỉ định action cụ thể (tùy chọn): inventory_summary, stock_in_plan, qc_risk_scan
 * - Hiển thị kết quả phân tích từ AI bao gồm:
 *   + Intent (ý định) và Confidence (độ tin cậy)
 *   + Kết quả từ chuyên gia được chọn
 *   + Thông tin RAG (Retrieval-Augmented Generation): citations, sources, scores
 * - Xem raw JSON response để debug
 * 
 * RAG (Retrieval-Augmented Generation):
 * - Truy xuất dữ liệu từ vector database để bổ sung ngữ cảnh cho LLM
 * - Hiển thị danh sách tài liệu tham khảo (citations) và điểm số liên quan
 */

import { useMemo, useState } from "react";
import { Bot, Database, Send, Sparkles } from "lucide-react";
import { routeAgent } from "../../services/aiAgent.service";
import type { AgentRouteResult, RetrievalCitation } from "../../types/aiAgent";

// Định nghĩa kiểu dữ liệu cho preset prompt (gợi ý nhanh)
type PresetPrompt = {
  label: string;  // Tên hiển thị của gợi ý
  value: string;  // Nội dung prompt đầy đủ
};

// Danh sách các gợi ý nhanh giúp người dùng dễ dàng thao tác
// Mỗi preset tập trung vào một khía cạnh cụ thể của hệ thống kho
const PRESET_PROMPTS: PresetPrompt[] = [
  {
    label: "Tồn kho tổng quan",
    value:
      "Cho tôi tổng quan tồn kho, cảnh báo lô sắp hết hạn và lô đã hết hạn.",
  },
  {
    label: "Gợi ý xuất kho",
    value:
      "Đề xuất xử lý xuất kho theo FIFO cho các lô có rủi ro tồn đọng cao.",
  },
  {
    label: "Rủi ro QC",
    value: "Tóm tắt các lot QC fail gần đây và đề xuất hành động ưu tiên.",
  },
];

/**
 * AIAgentConsole Component - Bảng điều khiển AI Agent
 * ====================================================
 * Cung cấp giao diện để người dùng tương tác với hệ thống AI đa chuyên gia
 * Sử dụng Supervisor Pattern để định tuyến yêu cầu đến đúng chuyên gia
 */
export default function AIAgentConsole() {
  // ===== State quản lý =====
  const [query, setQuery] = useState("");           // Câu hỏi/prompt từ người dùng
  const [action, setAction] = useState("");         // Action cụ thể (tùy chọn): inventory_summary, stock_in_plan, etc.
  const [loading, setLoading] = useState(false);    // Trạng thái đang gọi API
  const [error, setError] = useState("");           // Thông báo lỗi
  const [result, setResult] = useState<AgentRouteResult | null>(null); // Kết quả từ AI Agent

  // Format kết quả JSON để hiển thị trong raw view (dễ đọc với indent 2 spaces)
  const prettyResult = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ""),
    [result],
  );

  // Kiểm tra có thể submit form hay không: query không rỗng và không đang loading
  const canSubmit = query.trim().length > 0 && !loading;

  // Lấy thông tin retrieval (RAG) từ kết quả
  const retrieval = result?.result.data?.retrieval;
  // Danh sách các tài liệu tham khảo (citations) từ vector database
  const citations: RetrievalCitation[] =
    retrieval?.citations ?? result?.result.data?.retrieval_citations ?? [];

  // Tổng hợp số lượng citations theo nguồn (source_collection)
  // Ví dụ: { "inventory_lots": 5, "qc_tests": 3, ... }
  const sourceSummary = useMemo(() => {
    if (citations.length === 0) {
      return [] as Array<{ source: string; total: number }>;
    }

    // Đếm số lượng citations cho mỗi source_collection
    const countBySource = citations.reduce<Record<string, number>>(
      (acc, item) => {
        const key = item.source_collection || "unknown";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {},
    );

    // Chuyển đổi thành array và sắp xếp giảm dần theo số lượng
    return Object.entries(countBySource)
      .map(([source, total]) => ({ source, total }))
      .sort((a, b) => b.total - a.total);
  }, [citations]);

  // Tổng số tài liệu được truy xuất từ vector database
  const retrievalTotal = retrieval?.total ?? citations.length;

  /**
   * Xử lý gửi prompt tới AI Supervisor
   * ==================================
   * Quy trình:
   * 1. Kiểm tra có thể submit hay không (query không rỗng và không đang loading)
   * 2. Gọi routeAgent() để gửi prompt tới AI Supervisor
   * 3. Supervisor phân tích intent và định tuyến đến chuyên gia phù hợp:
   *    - InventoryAnalystAgent: Vấn đề tồn kho, xuất nhập
   *    - WarehouseOperatorAgent: Vấn đề vận hành kho
   *    - QcComplianceCheckerAgent: Vấn đề kiểm tra chất lượng
   * 4. Nhận kết quả bao gồm: intent, confidence, message, và retrieval data (RAG)
   * 5. Nếu lỗi: hiển thị thông báo lỗi
   */
  const onSubmit = async () => {
    if (!canSubmit) {
      return; // Không thỏa điều kiện submit
    }

    setLoading(true);
    setError("");

    try {
      // Gọi API routeAgent để gửi prompt tới AI Supervisor
      const response = await routeAgent({
        query: query.trim(),           // Câu hỏi/prompt đã loại bỏ khoảng trắng thừa
        action: action.trim() || undefined,  // Action cụ thể (tùy chọn)
      });
      setResult(response); // Lưu kết quả từ AI
    } catch (submitError) {
      // Xử lý lỗi khi gọi API (mạng, server, etc.)
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Không thể gọi AI Agent";
      setError(message);
      setResult(null); // Xóa kết quả cũ khi có lỗi
    } finally {
      setLoading(false); // Kết thúc trạng thái loading
    }
  };

  // ===== Giao diện Chính của AI Agent Console =====
  return (
    <div className="space-y-5">
      {/* Header: Tiêu đề và mô tả hệ thống AI Agent */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">
              AI Agent Console
            </h1>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-blue-700">
              Supervisor + chuyên gia Tồn kho / Kho vận / QC
            </p>
          </div>
          {/* Icon AI Bot */}
          <div className="rounded-xl bg-white p-3 text-blue-600 shadow-sm border border-blue-100">
            <Bot size={24} />
          </div>
        </div>
      </div>

      {/* Layout 2 cột: Trái (Input), Phải (Results) */}
      <div className="grid gap-5 xl:grid-cols-[minmax(360px,1fr)_minmax(0,1.2fr)] items-start">
        {/* ===== Left Panel: Form nhập prompt ===== */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          {/* Prompt Input: Câu hỏi cho AI */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Prompt
            </label>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={6}
              placeholder="Ví dụ: Phân tích xu hướng xuất kho 30 ngày gần nhất và cảnh báo thiếu hụt"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Input: Chỉ định chuyên gia cụ thể (tùy chọn) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Action (tùy chọn)
            </label>
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="inventory_summary | stock_in_plan | qc_risk_scan"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Preset Prompts: Các câu hỏi mẫu để người dùng dễ chọn */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Gợi ý nhanh
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setQuery(preset.value)}  // Tự động điền prompt vào textarea
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button: Gửi prompt tới AI Supervisor */}
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={!canSubmit}  // Vô hiệu hóa nếu query rỗng hoặc đang loading
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Sparkles size={16} className="animate-pulse" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Send size={16} />
                Gửi tới Supervisor
              </>
            )}
          </button>

          {/* Hiển thị lỗi nếu có */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>

        {/* ===== Right Panel: Hiển thị kết quả từ AI ===== */}
        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">
            Kết quả
          </h2>

          {/* Chưa có kết quả - hiển thị placeholder */}
          {!result && !loading && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Chưa có kết quả. Nhập prompt và gửi để AI Supervisor định tuyến.
            </div>
          )}

          {/* Hiển thị kết quả từ AI */}
          {result && (
            <>
              {/* Thẻ tóm tắt: Intent, Confidence, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Intent: Ý định của người dùng (inventory_check, qc_risk, etc.) */}
                <div className="rounded-xl bg-sky-50 border border-sky-100 px-3 py-2">
                  <p className="text-[11px] uppercase font-bold text-sky-600">
                    Intent
                  </p>
                  <p className="text-sm font-semibold text-sky-900 break-all">
                    {result.intent}
                  </p>
                </div>
                {/* Confidence: Độ tin cậy của việc phân loại intent (0-100%) */}
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <p className="text-[11px] uppercase font-bold text-emerald-600">
                    Confidence
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {(result.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                {/* Status: Trạng thái xử lý (success, error, etc.) */}
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                  <p className="text-[11px] uppercase font-bold text-amber-600">
                    Status
                  </p>
                  <p className="text-sm font-semibold text-amber-900">
                    {result.result.status}
                  </p>
                </div>
              </div>

              {/* AI Response: Message từ chuyên gia được chọn */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-900 mb-1">Message</p>
                <p className="whitespace-pre-wrap break-words">
                  {result.result.message}
                </p>
                {/* Assistant Reply: Phản hồi chi tiết từ LLM (nếu có) */}
                {result.result.assistant_reply && (
                  <>
                    <p className="font-semibold text-gray-900 mt-3 mb-1">
                      Assistant Reply
                    </p>
                    <p className="whitespace-pre-wrap break-words">
                      {result.result.assistant_reply}
                    </p>
                  </>
                )}
                {/* Lý do Supervisor chọn chuyên gia này */}
                <p className="mt-2 text-xs text-gray-500 break-words">
                  Lý do định tuyến: {result.reason}
                </p>
              </div>

              {/* ===== RAG Retrieval Section: Truy xuất tài liệu tham khảo ===== */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-700">
                    RAG Retrieval
                  </h3>
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-700">
                    <Database size={14} />
                    {retrieval?.mode ?? "semantic"}  {/* Chế độ truy xuất: semantic, keyword, etc. */}
                  </div>
                </div>

                {/* Thống kê Retrieval */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-xl border border-indigo-100 bg-white px-3 py-2">
                    <p className="text-[11px] uppercase font-bold text-indigo-500">
                      Mode
                    </p>
                    <p className="text-sm font-semibold text-indigo-900">
                      {retrieval?.mode ?? "semantic"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-white px-3 py-2">
                    <p className="text-[11px] uppercase font-bold text-indigo-500">
                      Used Embedding
                    </p>
                    <p className="text-sm font-semibold text-indigo-900">
                      {retrieval?.used_embedding ? "True" : "False"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-white px-3 py-2">
                    <p className="text-[11px] uppercase font-bold text-indigo-500">
                      Retrieved Docs
                    </p>
                    <p className="text-sm font-semibold text-indigo-900">
                      {retrievalTotal}  {/* Tổng số tài liệu truy xuất được */}
                    </p>
                  </div>
                </div>

                {/* Lý do RAG bị tắt (nếu có) */}
                {retrieval?.disabled_reason && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    disabled_reason: {retrieval.disabled_reason}
                  </div>
                )}

                {/* Tổng hợp nguồn tài liệu (Citation Sources) */}
                <div className="space-y-2">
                  <p className="text-[11px] uppercase font-bold tracking-widest text-indigo-600">
                    Citation Sources
                  </p>
                  {sourceSummary.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {sourceSummary.map((item) => (
                        <span
                          key={item.source}
                          className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 break-all"
                        >
                          {item.source} ({item.total})  {/* Tên collection và số lượng */}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-indigo-200 bg-white px-3 py-3 text-xs text-indigo-500">
                      Chưa có citation để hiển thị.
                    </div>
                  )}
                </div>

                {/* Bảng Top Citations: 10 tài liệu liên quan nhất */}
                {citations.length > 0 && (
                  <div className="rounded-xl border border-indigo-100 bg-white overflow-hidden">
                    <div className="px-3 py-2 border-b border-indigo-100 text-xs font-black uppercase tracking-widest text-indigo-600">
                      Top Citations
                    </div>
                    <div className="max-h-72 overflow-auto">
                      <table className="w-full min-w-[760px] text-xs table-fixed">
                        <thead className="bg-indigo-50 text-indigo-700 uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left w-36">Source</th>
                            <th className="px-3 py-2 text-left w-44">ID</th>
                            <th className="px-3 py-2 text-right w-20">Score</th>
                            <th className="px-3 py-2 text-left">Preview</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Hiển thị 10 citations có điểm số cao nhất */}
                          {citations.slice(0, 10).map((item) => (
                            <tr
                              key={`${item.citation_id}-${item.source_collection}-${item.source_id}`}
                              className="border-t border-indigo-50"
                            >
                              <td className="px-3 py-2 font-semibold text-indigo-900 whitespace-nowrap">
                                {item.source_collection}  {/* Tên collection lưu trữ */}
                              </td>
                              <td className="px-3 py-2 text-indigo-700 break-all align-top">
                                {item.source_id}  {/* ID của tài liệu */}
                              </td>
                              <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap align-top">
                                {typeof item.score === "number"
                                  ? item.score.toFixed(3)  // Điểm liên quan (0.000 - 1.000)
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-indigo-800 align-top">
                                <div className="max-h-20 overflow-auto whitespace-pre-wrap break-words">
                                  {item.preview ?? "-"}  {/* Xem trước nội dung */}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Raw JSON Response: Xem dữ liệu thô để debug */}
              <details className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
                <summary className="cursor-pointer select-none px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-300">
                  Raw JSON response
                </summary>
                <pre className="border-t border-gray-700 p-4 text-xs leading-5 text-green-200 overflow-auto max-h-[420px] whitespace-pre-wrap break-words">
                  {prettyResult}  {/* JSON đã format đẹp */}
                </pre>
              </details>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
