import { useMemo, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { routeAgent } from "../../services/aiAgent.service";
import type { AgentRouteResult } from "../../types/aiAgent";

type PresetPrompt = {
  label: string;
  value: string;
};

const PRESET_PROMPTS: PresetPrompt[] = [
  {
    label: "Tồn kho tổng quan",
    value: "Cho tôi tổng quan tồn kho, cảnh báo lô sắp hết hạn và lô đã hết hạn.",
  },
  {
    label: "Gợi ý xuất kho",
    value: "Đề xuất xử lý xuất kho theo FIFO cho các lô có rủi ro tồn đọng cao.",
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

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
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

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
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
                  <p className="text-[11px] uppercase font-bold text-sky-600">Intent</p>
                  <p className="text-sm font-semibold text-sky-900 break-all">{result.intent}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <p className="text-[11px] uppercase font-bold text-emerald-600">Confidence</p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {(result.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                  <p className="text-[11px] uppercase font-bold text-amber-600">Status</p>
                  <p className="text-sm font-semibold text-amber-900">{result.result.status}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-900 mb-1">Message</p>
                <p>{result.result.message}</p>
                <p className="mt-2 text-xs text-gray-500">Lý do định tuyến: {result.reason}</p>
              </div>

              <pre className="rounded-xl bg-gray-900 p-4 text-xs leading-5 text-green-200 overflow-auto max-h-[420px]">
                {prettyResult}
              </pre>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
