import { useState } from "react";
import { Bot, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { routeAgent } from "../../services/aiAgent.service";
import type { AgentRouteResult, AssistantLotRow } from "../../types/aiAgent";

type ChatRole = "assistant" | "user";
type UserRole =
  | "manager"
  | "operator"
  | "quality-control"
  | "it_admin"
  | "unknown";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  lots?: AssistantLotRow[];
  rag?: {
    mode: string;
    usedEmbedding: boolean;
    total: number;
    topSources: string[];
  };
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

function logRouteFallback(params: {
  phase: "initial_fallback" | "retry_still_unresolved";
  query: string;
  userRole: UserRole;
  inferredAction?: string;
  result: AgentRouteResult;
}): void {
  console.warn("[MyAssistantWidget] agent fallback", {
    phase: params.phase,
    query: params.query,
    userRole: params.userRole,
    inferredAction: params.inferredAction ?? null,
    intent: params.result.intent,
    status: params.result.result.status,
    confidence: params.result.confidence,
    reason: params.result.reason,
  });
}

function getCurrentUserRole(): UserRole {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      return "unknown";
    }

    const user = JSON.parse(userStr) as { role?: string };
    const role = user.role ?? "";
    const roleMap: Record<string, UserRole> = {
      Manager: "manager",
      Operator: "operator",
      "Quality Control Technician": "quality-control",
      "IT Administrator": "it_admin",
      manager: "manager",
      operator: "operator",
      "quality-control": "quality-control",
      it_admin: "it_admin",
    };

    return roleMap[role] ?? "unknown";
  } catch {
    return "unknown";
  }
}

function inferAgentAction(userText: string): string | undefined {
  const normalized = normalizeText(userText);

  const inventoryHints = [
    "tồn kho",
    "ton kho",
    "sắp hết hạn",
    "sap het han",
    "hết hạn",
    "het han",
    "còn hạn",
    "con han",
    "dưới 1 tháng",
    "duoi 1 thang",
    "inventory",
    "expiry",
  ];

  const qcHints = [
    "qc",
    "quality",
    "kiểm tra chất lượng",
    "kiem tra chat luong",
    "fail",
    "compliance",
  ];

  if (qcHints.some((hint) => normalized.includes(hint))) {
    return "qc_risk_scan";
  }

  if (inventoryHints.some((hint) => normalized.includes(hint))) {
    return "inventory_summary";
  }

  return undefined;
}

function isInventoryLikeQuery(userText: string): boolean {
  const normalized = normalizeText(userText);
  const hints = [
    "tồn kho",
    "ton kho",
    "sắp hết hạn",
    "sap het han",
    "hết hạn",
    "het han",
    "còn hạn",
    "con han",
    "dưới 1 tháng",
    "duoi 1 thang",
    "lô",
    "lot",
  ];

  return hints.some((hint) => normalized.includes(hint));
}

function extractDaysWindow(userText: string): number {
  const matched = userText.match(/(\d+)\s*ngày/i);
  if (!matched?.[1]) {
    return 30;
  }

  const parsed = Number(matched[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : 30;
}

function isTechnicalSentence(value: string): boolean {
  const normalized = normalizeText(value);
  return (
    normalized.includes("truy xuất") ||
    normalized.includes("tài liệu") ||
    normalized.includes("rag") ||
    normalized.includes("retrieval") ||
    normalized.includes("embedding") ||
    normalized.includes("citation") ||
    normalized.includes("semantic") ||
    normalized.includes("hybrid")
  );
}

function sanitizeAssistantReply(reply?: string): string {
  if (!reply) {
    return "";
  }

  const lines = reply
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const naturalLines = lines.filter((line) => !isTechnicalSentence(line));

  if (naturalLines.length > 0) {
    return naturalLines.join(" ");
  }

  return "";
}

function isInventoryReplyAligned(params: {
  reply: string;
  asksExpiring: boolean;
  asksExpired: boolean;
}): boolean {
  const normalized = normalizeText(params.reply);
  const hasExpiringSignal =
    normalized.includes("sắp hết hạn") ||
    normalized.includes("sap het han") ||
    normalized.includes("cận hạn") ||
    normalized.includes("con han") ||
    normalized.includes("còn hạn");
  const hasExpiredSignal =
    normalized.includes("đã hết hạn") ||
    normalized.includes("da het han") ||
    normalized.includes("quá hạn") ||
    normalized.includes("expired");

  if (params.asksExpiring) {
    return hasExpiringSignal && !hasExpiredSignal;
  }

  if (params.asksExpired) {
    return hasExpiredSignal && !hasExpiringSignal;
  }

  return (
    normalized.includes("tồn kho") ||
    normalized.includes("ton kho") ||
    normalized.includes("tổng quan") ||
    normalized.includes("tong quan")
  );
}

function isGenericQcReply(reply: string): boolean {
  const normalized = normalizeText(reply);
  return (
    normalized.includes("xem chi tiết") ||
    normalized.includes("dữ liệu đi kèm") ||
    normalized.includes("du lieu di kem")
  );
}

function buildNaturalQcReply(
  result: AgentRouteResult,
  fallback: string,
): string {
  const data = result.result.data as
    | {
        dashboard?: {
          pending_count?: number;
          approved_count?: number;
          rejected_count?: number;
          error_rate?: number;
        };
        supplier_performance?: Array<{
          supplier_name?: string;
          quality_rate?: number;
          total_batches?: number;
          rejected?: number;
        }>;
      }
    | undefined;

  const pending = Number(data?.dashboard?.pending_count ?? 0);
  const rejected = Number(data?.dashboard?.rejected_count ?? 0);
  const errorRate = Number(data?.dashboard?.error_rate ?? 0);
  const suppliers = Array.isArray(data?.supplier_performance)
    ? data?.supplier_performance
    : [];

  if (suppliers.length === 0 && pending === 0 && rejected === 0) {
    return fallback;
  }

  const worstSupplier = suppliers
    .filter((item) => typeof item.quality_rate === "number")
    .sort((a, b) => (a.quality_rate ?? 100) - (b.quality_rate ?? 100))[0];

  const summaryParts: string[] = [];
  summaryParts.push(
    `QC hiện có ${pending} lô đang chờ xử lý, ${rejected} lô bị từ chối.`,
  );

  if (errorRate > 0) {
    summaryParts.push(`Tỷ lệ lỗi QC hiện tại khoảng ${errorRate.toFixed(1)}%.`);
  }

  if (worstSupplier?.supplier_name) {
    const rate = Number(worstSupplier.quality_rate ?? 0);
    summaryParts.push(
      `Nhà cung cấp rủi ro cao nhất hiện tại là ${worstSupplier.supplier_name} với tỷ lệ đạt ${rate.toFixed(1)}%.`,
    );
  }

  summaryParts.push(
    "Đề xuất: ưu tiên xử lý các lô pending trước, sau đó tập trung kiểm tra nguyên nhân ở nhóm có chất lượng thấp.",
  );

  return summaryParts.join(" ");
}

function buildNaturalInventoryReply(params: {
  asksExpiring: boolean;
  asksExpired: boolean;
  expiringCount: number;
  expiredCount: number;
  totalLots?: number;
  daysWindow: number;
  shouldShowTable: boolean;
  userRole: UserRole;
}): string {
  const {
    asksExpiring,
    asksExpired,
    expiringCount,
    expiredCount,
    totalLots,
    daysWindow,
    shouldShowTable,
    userRole,
  } = params;

  const roleRecommendation = buildRoleRecommendation(
    userRole,
    expiringCount,
    expiredCount,
    daysWindow,
  );

  if (asksExpiring && !asksExpired) {
    if (expiringCount > 0) {
      return `Trong ${daysWindow} ngày tới có ${expiringCount} lô sắp hết hạn. ${roleRecommendation} Tôi đã liệt kê chi tiết ngay bên dưới.`;
    }
    return `Trong ${daysWindow} ngày tới hiện chưa ghi nhận lô sắp hết hạn theo dữ liệu hiện tại. ${roleRecommendation}`;
  }

  if (asksExpired && !asksExpiring) {
    if (expiredCount > 0) {
      return `Hiện có ${expiredCount} lô đã hết hạn. ${roleRecommendation}`;
    }
    return `Hiện chưa ghi nhận lô đã hết hạn theo dữ liệu hiện tại. ${roleRecommendation}`;
  }

  const summaryParts: string[] = [];
  if (typeof totalLots === "number" && totalLots > 0) {
    summaryParts.push(
      `Tổng quan hiện có ${totalLots} lô đang được theo dõi trong kho.`,
    );
  }
  if (expiringCount > 0) {
    summaryParts.push(
      `Có ${expiringCount} lô sắp hết hạn trong ${daysWindow} ngày tới.`,
    );
  }
  if (expiredCount > 0) {
    summaryParts.push(`Có ${expiredCount} lô đã hết hạn cần xử lý ưu tiên.`);
  }

  if (summaryParts.length === 0) {
    return "Tôi đã kiểm tra dữ liệu tồn kho. Hiện chưa thấy cảnh báo hạn dùng nổi bật trong phạm vi truy vấn.";
  }

  summaryParts.push(`Khuyến nghị: ${roleRecommendation}`);

  if (shouldShowTable) {
    summaryParts.push("Danh sách chi tiết đã được hiển thị bên dưới.");
  }

  return summaryParts.join(" ");
}

function buildRoleRecommendation(
  userRole: UserRole,
  expiringCount: number,
  expiredCount: number,
  daysWindow: number,
): string {
  const hasRiskLots = expiringCount > 0 || expiredCount > 0;

  if (userRole === "manager") {
    return hasRiskLots
      ? `Với vai trò quản lý, bạn nên chốt ưu tiên xử lý các lô rủi ro trong kế hoạch ${daysWindow} ngày tới.`
      : "Với vai trò quản lý, bạn có thể tiếp tục duy trì ngưỡng cảnh báo và theo dõi định kỳ.";
  }

  if (userRole === "operator") {
    return hasRiskLots
      ? "Với vai trò vận hành, bạn nên ưu tiên xuất FIFO cho lô cận hạn và cập nhật phiếu xuất/nhập ngay sau thao tác."
      : "Với vai trò vận hành, bạn có thể tiếp tục quy trình xuất nhập bình thường và theo dõi cảnh báo hàng ngày.";
  }

  if (userRole === "quality-control") {
    return hasRiskLots
      ? "Với vai trò QC, bạn nên rà soát điều kiện bảo quản và quyết định cách ly hoặc xử lý các lô đã quá hạn."
      : "Với vai trò QC, bạn có thể tiếp tục kiểm tra định kỳ và xác nhận điều kiện bảo quản đạt chuẩn.";
  }

  return hasRiskLots
    ? "Bạn nên ưu tiên xử lý các lô có rủi ro hạn dùng trước để giảm thất thoát."
    : "Hiện chưa có rủi ro hạn dùng nổi bật, bạn có thể tiếp tục theo dõi định kỳ.";
}

function shouldRenderExpiryTable(
  userText: string,
  result: AgentRouteResult,
): boolean {
  const normalized = normalizeText(userText);
  const asksExpiry =
    normalized.includes("sắp hết hạn") ||
    normalized.includes("sap het han") ||
    normalized.includes("dưới 1 tháng") ||
    normalized.includes("duoi 1 thang") ||
    normalized.includes("hết hạn") ||
    normalized.includes("het han");

  const expiringLots =
    (result.result.data?.expiringLots as unknown[] | undefined) ?? [];
  const expiredLots =
    (result.result.data?.expiredLots as unknown[] | undefined) ?? [];

  return asksExpiry || expiringLots.length > 0 || expiredLots.length > 0;
}

function buildAssistantMessage(
  userText: string,
  result: AgentRouteResult,
  userRole: UserRole,
): ChatMessage {
  const normalized = normalizeText(userText);
  const expiringLots =
    (result.result.data?.expiringLots as AssistantLotRow[] | undefined) ?? [];
  const expiredLots =
    (result.result.data?.expiredLots as AssistantLotRow[] | undefined) ?? [];

  const asksExpiring =
    normalized.includes("sắp hết hạn") ||
    normalized.includes("sap het han") ||
    normalized.includes("dưới 1 tháng") ||
    normalized.includes("duoi 1 thang") ||
    normalized.includes("hết hạn trong") ||
    normalized.includes("het han trong");
  const asksExpired =
    normalized.includes("đã hết hạn") ||
    normalized.includes("da het han") ||
    (normalized.includes("hết hạn") && !asksExpiring) ||
    normalized.includes("expired");
  const daysWindow = extractDaysWindow(userText);

  const lots = asksExpiring
    ? expiringLots
    : asksExpired
      ? expiredLots
      : [...expiringLots, ...expiredLots];
  const shouldShowTable =
    shouldRenderExpiryTable(userText, result) && lots.length > 0;

  const retrieval = result.result.data?.retrieval;
  const citations =
    retrieval?.citations ?? result.result.data?.retrieval_citations ?? [];
  const sourceOrder = citations
    .map((item) => item.source_collection)
    .filter(
      (source, index, arr) => Boolean(source) && arr.indexOf(source) === index,
    )
    .slice(0, 3);

  const ragMeta = retrieval
    ? {
        mode: retrieval.mode ?? "semantic",
        usedEmbedding: Boolean(retrieval.used_embedding),
        total: retrieval.total ?? citations.length,
        topSources: sourceOrder,
      }
    : undefined;

  const naturalModelReply = sanitizeAssistantReply(
    result.result.assistant_reply,
  );
  const lotSummary = result.result.data?.lots;
  const expiringCount =
    expiringLots.length > 0
      ? expiringLots.length
      : typeof lotSummary?.expiringSoon === "number"
        ? lotSummary.expiringSoon
        : 0;
  const expiredCount =
    expiredLots.length > 0
      ? expiredLots.length
      : typeof lotSummary?.expired === "number"
        ? lotSummary.expired
        : 0;

  const summary =
    result.intent === "inventory_analyst"
      ? naturalModelReply &&
        isInventoryReplyAligned({
          reply: naturalModelReply,
          asksExpiring,
          asksExpired,
        })
        ? naturalModelReply
        : buildNaturalInventoryReply({
            asksExpiring,
            asksExpired,
            expiringCount,
            expiredCount,
            totalLots:
              typeof lotSummary?.total === "number"
                ? lotSummary.total
                : undefined,
            daysWindow,
            shouldShowTable,
            userRole,
          })
      : result.intent === "qc_compliance_checker"
        ? naturalModelReply && !isGenericQcReply(naturalModelReply)
          ? naturalModelReply
          : buildNaturalQcReply(
              result,
              naturalModelReply ||
                "Tôi đã tổng hợp tình trạng QC hiện tại và đề xuất thứ tự xử lý ưu tiên.",
            )
        : naturalModelReply ||
          "Tôi đã tiếp nhận yêu cầu và trả về kết quả phù hợp với ngữ cảnh hiện tại.";

  return {
    id: `${Date.now()}-assistant`,
    role: "assistant",
    text: summary,
    lots: shouldShowTable ? lots : undefined,
    rag: ragMeta,
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

  const sendMessage = async (content: string) => {
    const text = content.normalize("NFC").trim();
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
      const currentRole = getCurrentUserRole();
      const inferredAction = inferAgentAction(text);
      let result = await routeAgent({
        query: text,
        action: inferredAction,
        payload: { userRole: currentRole },
      });

      const shouldRetryRouting =
        (result.intent === "unknown" ||
          result.result.status === "needs_input") &&
        (Boolean(inferredAction) || isInventoryLikeQuery(text));

      if (shouldRetryRouting) {
        logRouteFallback({
          phase: "initial_fallback",
          query: text,
          userRole: currentRole,
          inferredAction,
          result,
        });

        result = await routeAgent({
          query: text,
          action: inferredAction ?? "inventory_summary",
          payload: { userRole: currentRole },
        });

        if (
          result.intent === "unknown" ||
          result.result.status === "needs_input"
        ) {
          logRouteFallback({
            phase: "retry_still_unresolved",
            query: text,
            userRole: currentRole,
            inferredAction: inferredAction ?? "inventory_summary",
            result,
          });
        }
      }

      const assistantMessage = buildAssistantMessage(text, result, currentRole);
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
                <p className="text-[11px] text-white/80">
                  Trợ lý kho thông minh
                </p>
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
                <div className="flex max-w-[90%] flex-col">
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-sky-600 text-white"
                        : "bg-white border border-slate-200 text-slate-700"
                    }`}
                  >
                    {message.text}
                  </div>

                  {message.role === "assistant" && message.rag && (
                    <details className="mt-2 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2">
                      <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-sky-700 select-none">
                        Chi tiết kỹ thuật (RAG)
                      </summary>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-sky-800">
                        <span>mode: {message.rag.mode}</span>
                        <span>
                          embedding:{" "}
                          {message.rag.usedEmbedding ? "true" : "false"}
                        </span>
                        <span>docs: {message.rag.total}</span>
                        <span>
                          sources:{" "}
                          {message.rag.topSources.length > 0
                            ? message.rag.topSources.join(", ")
                            : "n/a"}
                        </span>
                      </div>
                    </details>
                  )}

                  {message.role === "assistant" &&
                    message.lots &&
                    message.lots.length > 0 && (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <div className="px-3 py-2 bg-slate-100 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                          Danh sách lô phù hợp điều kiện
                        </div>
                        <div className="max-h-52 overflow-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-500 uppercase">
                              <tr>
                                <th className="px-2 py-2 text-left">Lot</th>
                                <th className="px-2 py-2 text-left">
                                  Material
                                </th>
                                <th className="px-2 py-2 text-left">HSD</th>
                                <th className="px-2 py-2 text-right">SL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {message.lots.map((lot) => (
                                <tr
                                  key={`${lot.lot_id}-${lot.expiration_date}`}
                                  className="border-t border-slate-100"
                                >
                                  <td className="px-2 py-2 font-semibold text-slate-800">
                                    {lot.lot_id}
                                  </td>
                                  <td className="px-2 py-2 text-slate-600">
                                    {lot.material_id}
                                  </td>
                                  <td className="px-2 py-2 text-slate-600">
                                    {new Date(
                                      lot.expiration_date,
                                    ).toLocaleDateString("vi-VN")}
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
              </div>
            ))}

            {isLoading && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-600">
                <Sparkles size={14} className="animate-pulse" />
                Đang xử lý yêu cầu...
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
