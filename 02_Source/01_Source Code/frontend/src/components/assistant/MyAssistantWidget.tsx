import { useMemo, useState } from "react";
import { Bot, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { routeAgent } from "../../services/aiAgent.service";
import type { AgentRouteResult, AssistantLotRow } from "../../types/aiAgent";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  lots?: AssistantLotRow[];
};

const QUICK_SUGGESTIONS = [
  "Hàng sắp hết hạn",
  "Hàng còn hạn dưới 1 tháng",
  "Tổng quan tồn kho hiện tại",
  "Các lô đã hết hạn",
];

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function shouldRenderExpiryTable(userText: string, result: AgentRouteResult): boolean {
  const normalized = normalizeText(userText);
  const asksExpiry =
    normalized.includes("sắp hết hạn") ||
    normalized.includes("sap het han") ||
    normalized.includes("dưới 1 tháng") ||
    normalized.includes("duoi 1 thang") ||
    normalized.includes("hết hạn") ||
    normalized.includes("het han");

  return (
    asksExpiry ||
    (result.result.data?.expiringLots as unknown[] | undefined)?.length !== 0 ||
    (result.result.data?.expiredLots as unknown[] | undefined)?.length !== 0
  );
}

function buildAssistantMessage(userText: string, result: AgentRouteResult): ChatMessage {
  const expiringLots =
    (result.result.data?.expiringLots as AssistantLotRow[] | undefined) ?? [];
  const expiredLots =
    (result.result.data?.expiredLots as AssistantLotRow[] | undefined) ?? [];

  const lots = [...expiringLots, ...expiredLots];
  const shouldShowTable = shouldRenderExpiryTable(userText, result) && lots.length > 0;

  const summary = shouldShowTable
    ? `Tôi đã tìm thấy ${lots.length} lô phù hợp điều kiện thời hạn. Bạn có thể xem danh sách chi tiết bên dưới.`
    : result.result.message;

  return {
    id: `${Date.now()}-assistant`,
    role: "assistant",
    text: summary,
    lots: shouldShowTable ? lots : undefined,
  };
}

export default function MyAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Xin chào, tôi là My Assistant. Bạn cần tôi giúp gì?",
    },
  ]);

  const canSend = input.trim().length > 0 && !isLoading;

  const latestAssistantLots = useMemo(() => {
    const reversed = [...messages].reverse();
    const withLots = reversed.find((message) => message.role === "assistant" && message.lots?.length);
    return withLots?.lots ?? [];
  }, [messages]);

  const sendMessage = async (content: string) => {
    const text = content.trim();
    if (!text) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await routeAgent({ query: text });
      const assistantMessage = buildAssistantMessage(text, result);
      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Xin lỗi, tôi chưa thể xử lý yêu cầu này.";
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          text: `Hiện tại tôi chưa thể phản hồi: ${message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed right-5 bottom-5 z-[70]">
      {isOpen && (
        <div className="mb-3 w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-sky-100 bg-white shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={18} />
              <div>
                <p className="text-sm font-bold">My Assistant</p>
                <p className="text-[11px] text-white/80">Trợ lý kho thông minh</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 hover:bg-white/20"
              aria-label="Đóng trợ lý"
            >
              <X size={16} />
            </button>
          </div>

          <div className="h-[320px] overflow-y-auto px-3 py-3 space-y-2 bg-slate-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-sky-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-600">
                <Sparkles size={14} className="animate-pulse" />
                Đang xử lý yêu cầu...
              </div>
            )}

            {latestAssistantLots.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-3 py-2 bg-slate-100 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Danh sách lô phù hợp điều kiện
                </div>
                <div className="max-h-52 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase">
                      <tr>
                        <th className="px-2 py-2 text-left">Lot</th>
                        <th className="px-2 py-2 text-left">Material</th>
                        <th className="px-2 py-2 text-left">HSD</th>
                        <th className="px-2 py-2 text-right">SL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestAssistantLots.map((lot) => (
                        <tr key={`${lot.lot_id}-${lot.expiration_date}`} className="border-t border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-800">{lot.lot_id}</td>
                          <td className="px-2 py-2 text-slate-600">{lot.material_id}</td>
                          <td className="px-2 py-2 text-slate-600">
                            {new Date(lot.expiration_date).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-700">
                            {lot.quantity} {lot.unit_of_measure}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="px-3 py-2 border-t border-slate-100 bg-white">
            <p className="text-[11px] text-slate-500 mb-2">Gợi ý nhanh</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void sendMessage(item)}
                  className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void sendMessage(input);
                  }
                }}
                placeholder="Bạn cần tôi giúp gì?"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
              <button
                type="button"
                disabled={!canSend}
                onClick={() => void sendMessage(input)}
                className="rounded-xl bg-sky-600 p-2.5 text-white disabled:opacity-50 hover:bg-sky-700"
                aria-label="Gửi yêu cầu"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-600 to-cyan-600 text-white shadow-xl hover:scale-105 transition"
        aria-label="Mở My Assistant"
      >
        <MessageSquare size={22} />
      </button>
    </div>
  );
}
