import { useMemo, useState } from "react";
import { Bot, Database, Send, Sparkles } from "lucide-react";
import { routeAgent } from "../../services/aiAgent.service";
import type { AgentRouteResult, RetrievalCitation } from "../../types/aiAgent";

type PresetPrompt = {
  label: string;
  value: string;
};

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

export default function AIAgentConsole() {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AgentRouteResult | null>(null);

  const prettyResult = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ""),
    [result],
  );

  const canSubmit = query.trim().length > 0 && !loading;

  const retrieval = result?.result.data?.retrieval;
  const citations: RetrievalCitation[] =
    retrieval?.citations ?? result?.result.data?.retrieval_citations ?? [];

  const sourceSummary = useMemo(() => {
    if (citations.length === 0) {
      return [] as Array<{ source: string; total: number }>;
    }

    const countBySource = citations.reduce<Record<string, number>>(
      (acc, item) => {
        const key = item.source_collection || "unknown";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {},
    );

    return Object.entries(countBySource)
      .map(([source, total]) => ({ source, total }))
      .sort((a, b) => b.total - a.total);
  }, [citations]);

  const retrievalTotal = retrieval?.total ?? citations.length;

  const onSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await routeAgent({
        query: query.trim(),
        action: action.trim() || undefined,
      });
      setResult(response);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Không thể gọi AI Agent";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
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
          <div className="rounded-xl bg-white p-3 text-blue-600 shadow-sm border border-blue-100">
            <Bot size={24} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,1fr)_minmax(0,1.2fr)] items-start">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
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

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Gợi ý nhanh
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setQuery(preset.value)}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={!canSubmit}
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

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">
            Kết quả
          </h2>

          {!result && !loading && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Chưa có kết quả. Nhập prompt và gửi để AI Supervisor định tuyến.
            </div>
          )}

          {result && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-xl bg-sky-50 border border-sky-100 px-3 py-2">
                  <p className="text-[11px] uppercase font-bold text-sky-600">
                    Intent
                  </p>
                  <p className="text-sm font-semibold text-sky-900 break-all">
                    {result.intent}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <p className="text-[11px] uppercase font-bold text-emerald-600">
                    Confidence
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {(result.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                  <p className="text-[11px] uppercase font-bold text-amber-600">
                    Status
                  </p>
                  <p className="text-sm font-semibold text-amber-900">
                    {result.result.status}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-900 mb-1">Message</p>
                <p className="whitespace-pre-wrap break-words">
                  {result.result.message}
                </p>
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
                <p className="mt-2 text-xs text-gray-500 break-words">
                  Lý do định tuyến: {result.reason}
                </p>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-700">
                    RAG Retrieval
                  </h3>
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-700">
                    <Database size={14} />
                    {retrieval?.mode ?? "semantic"}
                  </div>
                </div>

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
                      {retrievalTotal}
                    </p>
                  </div>
                </div>

                {retrieval?.disabled_reason && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    disabled_reason: {retrieval.disabled_reason}
                  </div>
                )}

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
                          {item.source} ({item.total})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-indigo-200 bg-white px-3 py-3 text-xs text-indigo-500">
                      Chưa có citation để hiển thị.
                    </div>
                  )}
                </div>

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
                          {citations.slice(0, 10).map((item) => (
                            <tr
                              key={`${item.citation_id}-${item.source_collection}-${item.source_id}`}
                              className="border-t border-indigo-50"
                            >
                              <td className="px-3 py-2 font-semibold text-indigo-900 whitespace-nowrap">
                                {item.source_collection}
                              </td>
                              <td className="px-3 py-2 text-indigo-700 break-all align-top">
                                {item.source_id}
                              </td>
                              <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap align-top">
                                {typeof item.score === "number"
                                  ? item.score.toFixed(3)
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-indigo-800 align-top">
                                <div className="max-h-20 overflow-auto whitespace-pre-wrap break-words">
                                  {item.preview ?? "-"}
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

              <details className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
                <summary className="cursor-pointer select-none px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-300">
                  Raw JSON response
                </summary>
                <pre className="border-t border-gray-700 p-4 text-xs leading-5 text-green-200 overflow-auto max-h-[420px] whitespace-pre-wrap break-words">
                  {prettyResult}
                </pre>
              </details>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
