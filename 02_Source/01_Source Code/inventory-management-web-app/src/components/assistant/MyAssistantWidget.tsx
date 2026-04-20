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
  transactions?: AssistantTransactionRow[];
  rag?: {
    mode: string;
    usedEmbedding: boolean;
    total: number;
    topSources: string[];
  };
};

type AssistantTransactionRow = {
  id: string;
  type: string;
  materialId: string;
  quantity: string;
  happenedAt: string;
};

const QUICK_SUGGESTIONS = [
  "Hàng sắp hết hạn",
  "Hàng còn hạn dưới 1 tháng",
  "10 giao dịch kho gần nhất",
  "Tổng quan tồn kho hiện tại",
  "Các lô đã hết hạn",
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[!?.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text: string, hints: string[]): boolean {
  return hints.some((hint) => text.includes(hint));
}

function isExpiringIntent(normalized: string): boolean {
  const expiringHints = [
    "sap het han",
    "can han",
    "can date",
    "gan het han",
    "duoi 1 thang",
    "het han trong",
    "con han",
    "near expiry",
    "near-expiry",
    "expiring",
    "han dung",
  ];

  return containsAny(normalized, expiringHints);
}

function isExpiredIntent(normalized: string, asksExpiring: boolean): boolean {
  const expiredHints = [
    "da het han",
    "qua han",
    "expired",
    "het date",
    "qua date",
    "het hsd",
  ];

  if (containsAny(normalized, expiredHints)) {
    return true;
  }

  return normalized.includes("het han") && !asksExpiring;
}

function isRecentTransactionIntent(normalized: string): boolean {
  const transactionHints = [
    "transaction",
    "transactions",
    "giao dich",
    "xuat nhap",
    "lich su kho",
    "recent",
    "gan day",
    "moi nhat",
    "latest",
  ];

  return containsAny(normalized, transactionHints);
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
    "ton kho",
    "sap het han",
    "het han",
    "con han",
    "can han",
    "can date",
    "gan het han",
    "duoi 1 thang",
    "han dung",
    "het date",
    "qua date",
    "stock",
    "stock overview",
    "inventory status",
    "inventory",
    "near expiry",
    "near-expiry",
    "expiry",
    "expiring",
    "expired",
    "batch",
    "lot",
    "transaction",
    "giao dich",
    "xuat nhap",
    "lich su kho",
  ];

  const qcHints = [
    "qc",
    "quality",
    "kiem tra chat luong",
    "fail",
    "khong dat",
    "lot qc",
    "compliance",
  ];

  if (containsAny(normalized, qcHints)) {
    return "qc_risk_scan";
  }

  if (containsAny(normalized, inventoryHints)) {
    return "inventory_summary";
  }

  return undefined;
}

function isInventoryLikeQuery(userText: string): boolean {
  const normalized = normalizeText(userText);
  const hints = [
    "ton kho",
    "sap het han",
    "het han",
    "con han",
    "can han",
    "can date",
    "gan het han",
    "duoi 1 thang",
    "han dung",
    "stock",
    "inventory",
    "near expiry",
    "near-expiry",
    "expired",
    "expiring",
    "het date",
    "qua date",
    "batch",
    "lo",
    "lot",
    "transaction",
    "giao dich",
    "xuat nhap",
    "lich su kho",
  ];

  return containsAny(normalized, hints);
}

function extractDaysWindow(userText: string): number {
  const normalized = normalizeText(userText);

  const dayMatch = normalized.match(/(\d+)\s*(ngay|day|d)\b/);
  if (dayMatch?.[1]) {
    const parsed = Number(dayMatch[1]);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : 30;
  }

  const weekMatch = normalized.match(/(\d+)\s*(tuan|week|w)\b/);
  if (weekMatch?.[1]) {
    const parsed = Number(weekMatch[1]) * 7;
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : 30;
  }

  const monthMatch = normalized.match(/(\d+)\s*(thang|month|months)\b/);
  if (monthMatch?.[1]) {
    const parsed = Number(monthMatch[1]) * 30;
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : 30;
  }

  return 30;
}

function extractTransactionLimit(userText: string): number {
  const normalized = normalizeText(userText);
  const matched = normalized.match(/\b(\d{1,3})\b/);
  if (!matched?.[1]) {
    return 10;
  }

  const parsed = Number(matched[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : 10;
}

function isTechnicalSentence(value: string): boolean {
  const normalized = normalizeText(value);
  return (
    normalized.includes("truy xuat") ||
    normalized.includes("tai lieu") ||
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
  asksTransactions: boolean;
}): boolean {
  const normalized = normalizeText(params.reply);
  const hasExpiringSignal =
    normalized.includes("sap het han") ||
    normalized.includes("can han") ||
    normalized.includes("can date") ||
    normalized.includes("con han") ||
    normalized.includes("near expiry") ||
    normalized.includes("expiring");
  const hasExpiredSignal =
    normalized.includes("da het han") ||
    normalized.includes("qua han") ||
    normalized.includes("het date") ||
    normalized.includes("expired");
  const hasTransactionSignal =
    normalized.includes("giao dich") ||
    normalized.includes("transaction") ||
    normalized.includes("xuat") ||
    normalized.includes("nhap") ||
    normalized.includes("ma giao dich");

  if (params.asksTransactions) {
    return hasTransactionSignal;
  }

  if (params.asksExpiring) {
    return hasExpiringSignal && !hasExpiredSignal;
  }

  if (params.asksExpired) {
    return hasExpiredSignal && !hasExpiringSignal;
  }

  return (
    normalized.includes("ton kho") ||
    normalized.includes("tong quan") ||
    normalized.includes("stock overview") ||
    normalized.includes("inventory status")
  );
}

function normalizeTransactionRows(
  raw: unknown,
  limit: number,
): AssistantTransactionRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.slice(0, limit).map((item, index) => {
    const tx =
      typeof item === "object" && item !== null
        ? (item as Record<string, unknown>)
        : {};

    const id =
      (typeof tx.transaction_id === "string" && tx.transaction_id) ||
      (typeof tx.id === "string" && tx.id) ||
      `TX-${index + 1}`;
    const type =
      (typeof tx.transaction_type === "string" && tx.transaction_type) ||
      (typeof tx.type === "string" && tx.type) ||
      "UNKNOWN";
    const materialId =
      (typeof tx.material_id === "string" && tx.material_id) ||
      (typeof tx.lot_id === "string" && tx.lot_id) ||
      "N/A";
    const quantityValue =
      typeof tx.quantity === "number" || typeof tx.quantity === "string"
        ? String(tx.quantity)
        : "N/A";
    const unit =
      (typeof tx.unit_of_measure === "string" && tx.unit_of_measure) ||
      (typeof tx.unit === "string" && tx.unit) ||
      "";
    const happenedAtRaw =
      (typeof tx.transaction_date === "string" && tx.transaction_date) ||
      (typeof tx.created_date === "string" && tx.created_date) ||
      (typeof tx.modified_date === "string" && tx.modified_date) ||
      "N/A";

    return {
      id,
      type,
      materialId,
      quantity: `${quantityValue}${unit ? ` ${unit}` : ""}`.trim(),
      happenedAt:
        happenedAtRaw !== "N/A"
          ? new Date(happenedAtRaw).toLocaleString("vi-VN")
          : "N/A",
    };
  });
}

function isVerboseTransactionReply(reply: string): boolean {
  const normalized = normalizeText(reply);
  const idMentions = (normalized.match(/ma giao dich/g) || []).length;
  const numberedMentions = (normalized.match(/\d+\./g) || []).length;

  return reply.length > 280 || idMentions >= 3 || numberedMentions >= 5;
}

function buildCompactTransactionsReply(
  rows: AssistantTransactionRow[],
  requestedLimit: number,
): string {
  if (rows.length === 0) {
    return "Hiện chưa có giao dịch kho gần đây trong phạm vi truy vấn.";
  }

  return `Đã lấy ${Math.min(requestedLimit, rows.length)} giao dịch kho gần nhất. Bảng chi tiết hiển thị ngay bên dưới.`;
}

function isGenericQcReply(reply: string): boolean {
  const normalized = normalizeText(reply);
  return (
    normalized.includes("xem chi tiet") || normalized.includes("du lieu di kem")
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
    isExpiringIntent(normalized) || isExpiredIntent(normalized, false);

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

  const asksExpiring = isExpiringIntent(normalized);
  const asksExpired = isExpiredIntent(normalized, asksExpiring);
  const asksTransactions = isRecentTransactionIntent(normalized);
  const daysWindow = extractDaysWindow(userText);
  const requestedTransactionLimit = extractTransactionLimit(userText);

  const transactionRows = normalizeTransactionRows(
    result.result.data?.transactions,
    requestedTransactionLimit,
  );

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
      ? asksTransactions
        ? naturalModelReply &&
          isInventoryReplyAligned({
            reply: naturalModelReply,
            asksExpiring,
            asksExpired,
            asksTransactions,
          }) &&
          !isVerboseTransactionReply(naturalModelReply)
          ? naturalModelReply
          : buildCompactTransactionsReply(
              transactionRows,
              requestedTransactionLimit,
            )
        : naturalModelReply &&
            isInventoryReplyAligned({
              reply: naturalModelReply,
              asksExpiring,
              asksExpired,
              asksTransactions,
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
    transactions: asksTransactions ? transactionRows : undefined,
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

                  {message.role === "assistant" &&
                    message.transactions &&
                    message.transactions.length > 0 && (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <div className="px-3 py-2 bg-slate-100 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                          Giao dịch kho gần đây
                        </div>
                        <div className="max-h-52 overflow-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-500 uppercase">
                              <tr>
                                <th className="px-2 py-2 text-left">
                                  Thời gian
                                </th>
                                <th className="px-2 py-2 text-left">Loại</th>
                                <th className="px-2 py-2 text-left">
                                  Material/Lot
                                </th>
                                <th className="px-2 py-2 text-left">
                                  Số lượng
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {message.transactions.map((tx) => (
                                <tr
                                  key={tx.id}
                                  className="border-t border-slate-100"
                                >
                                  <td className="px-2 py-2 text-slate-600">
                                    {tx.happenedAt}
                                  </td>
                                  <td className="px-2 py-2 font-semibold text-slate-800">
                                    {tx.type}
                                  </td>
                                  <td className="px-2 py-2 text-slate-600">
                                    {tx.materialId}
                                  </td>
                                  <td className="px-2 py-2 text-slate-700">
                                    {tx.quantity}
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
