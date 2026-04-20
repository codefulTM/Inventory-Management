import { Injectable } from "@nestjs/common";
import { BackendDataService } from "../../backend-client/backend-data.service";
import { RagSearchResponse } from "../../backend-client/backend-data.service";
import { AgentLlmService } from "../services/agent-llm.service";
import { QueryEmbeddingService } from "../services/query-embedding.service";
import type { AgentHandlerInput, AgentHandlerOutput } from "../ai-agents.types";

type UserRole =
  | "manager"
  | "operator"
  | "quality-control"
  | "it_admin"
  | "unknown";

type NearestExpiryLot = {
  sourceId: string;
  expirationDate: string;
  daysRemaining: number;
};

type TransactionDigest = {
  id: string;
  type: string;
  materialId: string;
  quantity: string;
  happenedAt: string;
};

@Injectable()
export class InventoryAnalystAgent {
  private readonly profile = {
    name: "Inventory Analyst",
    description:
      "Phân tích tồn kho, cảnh báo hạn sử dụng, và tổng hợp dữ liệu giao dịch kho.",
    instructions: [
      "Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, dễ hiểu cho người dùng cuối.",
      "Ưu tiên thông tin cảnh báo hạn sử dụng và các bước hành động tiếp theo.",
      "Nếu có dữ liệu lô sắp hết hạn/hết hạn, nhắc người dùng xem bảng chi tiết.",
    ],
    model: "gemini-2.5-flash",
    tools: [
      "BackendDataService.getLotsStatistics",
      "BackendDataService.getExpiringSoon",
      "BackendDataService.getExpiredLots",
      "BackendDataService.getTransactions",
      "BackendDataService.semanticSearch",
      "BackendDataService.hybridSearch",
      "QueryEmbeddingService.embedQuery",
      "AgentLlmService.generateReply",
    ],
  };

  constructor(
    private readonly backendDataService: BackendDataService,
    private readonly agentLlmService: AgentLlmService,
    private readonly queryEmbeddingService: QueryEmbeddingService,
  ) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    try {
      if (!this.isInventoryDomainQuery(input.query, input.action)) {
        return {
          status: "needs_input",
          message:
            "Inventory Analyst only handles inventory analytics and expiry-related queries.",
          assistant_reply:
            'Tôi chỉ hỗ trợ phân tích tồn kho và hạn dùng. Bạn có thể hỏi như: "các lô sắp hết hạn" hoặc "báo cáo tồn kho".',
          agent_profile: this.profile,
          data: {
            query: input.query,
            supported_topics: [
              "thống kê tồn kho",
              "lô sắp hết hạn",
              "lô đã hết hạn",
              "báo cáo giao dịch kho",
            ],
          },
        };
      }

      const normalizedQuery = this.normalizeForMatching(input.query || "");
      const page = Number(input.payload?.page ?? 1);
      const limit = Number(input.payload?.limit ?? 20);
      const userRole = this.normalizeUserRole(input.payload?.userRole);
      const asksRecentTransactions =
        this.detectRecentTransactionsIntent(normalizedQuery);
      const requestedTransactionLimit = asksRecentTransactions
        ? this.extractTransactionLimit(normalizedQuery)
        : limit;
      const transactionPage = asksRecentTransactions ? 1 : page;

      const [lotStats, transactions] = await Promise.all([
        this.backendDataService.getLotsStatistics(),
        this.backendDataService.getTransactions(
          transactionPage,
          requestedTransactionLimit,
        ),
      ]);

      const requestedDaysWindow = this.extractDaysWindow(normalizedQuery);
      const asksExpiringSoon = this.detectExpiringIntent(normalizedQuery);
      const asksExpired = this.detectExpiredIntent(
        normalizedQuery,
        asksExpiringSoon,
      );

      let expiringLots: unknown[] = [];
      let expiredLots: unknown[] = [];
      let retrieval: RagSearchResponse = {
        query: input.query,
        top_k: 5,
        total: 0,
        hits: [],
        search_mode: "semantic",
      };
      let retrievalFallbackReason: string | undefined;

      const businessCollections = [
        "inventory_lots",
        "inventory_transactions",
        "qc_tests",
      ];
      const docsCollections = ["docs_knowledge"];

      if (asksExpiringSoon)
        expiringLots =
          await this.backendDataService.getExpiringSoon(requestedDaysWindow);
      if (asksExpired)
        expiredLots = await this.backendDataService.getExpiredLots();

      try {
        const queryEmbedding = await this.queryEmbeddingService.embedQuery(
          input.query,
        );

        if (queryEmbedding && queryEmbedding.length > 0) {
          try {
            retrieval = await this.backendDataService.hybridSearch(
              input.query,
              queryEmbedding,
              5,
              businessCollections,
            );
          } catch {
            retrievalFallbackReason =
              "hybrid search unavailable, fallback to semantic";
            retrieval = await this.backendDataService.semanticSearch(
              input.query,
              5,
              businessCollections,
            );
          }
        } else {
          retrieval = await this.backendDataService.semanticSearch(
            input.query,
            5,
            businessCollections,
          );
        }

        if (retrieval.total === 0 || retrieval.hits.length === 0) {
          const docsRetrieval = await this.backendDataService.semanticSearch(
            input.query,
            5,
            docsCollections,
          );
          if (docsRetrieval.total > 0 && docsRetrieval.hits.length > 0) {
            retrieval = docsRetrieval;
            retrieval.disabled_reason = retrievalFallbackReason
              ? `${retrievalFallbackReason}; inventory context empty, fallback to docs_knowledge`
              : "inventory context empty, fallback to docs_knowledge";
            retrievalFallbackReason = undefined;
          }
        }
      } catch {
        retrieval = {
          query: input.query,
          top_k: 5,
          total: 0,
          hits: [],
          search_mode: "semantic",
          disabled_reason: "semantic search unavailable",
        };
      }

      if (!retrieval.disabled_reason && retrievalFallbackReason) {
        retrieval.disabled_reason = retrievalFallbackReason;
      }

      const retrievalHighlights = retrieval.hits.slice(0, 3).map((hit) => ({
        source_collection: hit.source_collection,
        source_id: hit.source_id,
        score: hit.score,
        rag_text_preview: (hit.rag_text || "").slice(0, 220),
      }));

      const retrievalCitations = retrieval.hits
        .slice(0, 5)
        .map((hit, index) => ({
          citation_id: `SRC-${index + 1}`,
          source_collection: hit.source_collection,
          source_id: hit.source_id,
          source_type: hit.source_type,
          score: hit.score,
          updated_at: hit.updated_at,
          preview: (hit.rag_text || "").slice(0, 320),
        }));

      const nearestExpiryLot =
        this.extractNearestExpiryLotFromCitations(retrievalCitations);
      const transactionDigests = this.extractTransactionDigests(
        (transactions as any)?.items,
        requestedTransactionLimit,
      );

      const insights: string[] = [];
      if (!asksExpiringSoon && !asksExpired && (lotStats as any).expired > 0) {
        insights.push(
          `${(lotStats as any).expired} lô hàng đã hết hạn và cần được xử lý ngay lập tức.`,
        );
      }
      if (
        !asksExpiringSoon &&
        !asksExpired &&
        (lotStats as any).expiringSoon > 0
      ) {
        insights.push(
          `${(lotStats as any).expiringSoon} lô hàng sắp hết hạn và cần lập kế hoạch xử lý.`,
        );
      }
      if (asksExpiringSoon && expiringLots.length > 0) {
        insights.push(
          `Tìm thấy ${expiringLots.length} lô hàng còn hạn trong ${requestedDaysWindow} ngày.`,
        );
      }
      if (asksExpired && expiredLots.length > 0) {
        insights.push(`Tìm thấy ${expiredLots.length} lô hàng đã hết hạn.`);
      }

      const contextData = {
        lots: lotStats,
        expiringLots,
        expiredLots,
        transactions: (transactions as any).items,
        transaction_digests: transactionDigests,
        pagination: {
          page: transactionPage,
          limit: requestedTransactionLimit,
          total: (transactions as any).total,
          totalPages: Math.ceil(
            (transactions as any).total / requestedTransactionLimit,
          ),
        },
        retrieval: {
          total: retrieval.total,
          mode: retrieval.search_mode,
          used_embedding: retrieval.used_embedding,
          disabled_reason: retrieval.disabled_reason,
          highlights: retrievalHighlights,
          citations: retrievalCitations,
        },
        nearest_expiry_lot: nearestExpiryLot,
        insights,
        query_window_days: requestedDaysWindow,
      };

      const generatedReply = await this.agentLlmService.generateReply(
        this.profile,
        input.query,
        contextData as any,
      );

      const lotSummary = {
        total: this.toSafeNumber((lotStats as any)?.total),
        expiringSoon: this.toSafeNumber((lotStats as any)?.expiringSoon),
        expired: this.toSafeNumber((lotStats as any)?.expired),
      };

      const sanitizedReply = this.sanitizeAssistantReply(generatedReply);
      const shouldUseSanitizedReply =
        sanitizedReply.length > 0 &&
        this.isReplyAlignedToQuery(
          sanitizedReply,
          asksExpiringSoon,
          asksExpired,
          asksRecentTransactions,
        );

      const assistantReply = shouldUseSanitizedReply
        ? sanitizedReply
        : this.buildFallbackReply(
            lotSummary,
            expiringLots.length,
            expiredLots.length,
            asksExpiringSoon,
            asksExpired,
            asksRecentTransactions,
            requestedDaysWindow,
            insights,
            userRole,
            nearestExpiryLot,
            transactionDigests,
            requestedTransactionLimit,
          );

      return {
        status: "ok",
        message: "Inventory analysis generated successfully.",
        assistant_reply: assistantReply,
        agent_profile: this.profile,
        data: {
          query: input.query,
          retrieval_citations: retrievalCitations,
          ...contextData,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        status: "error",
        message: `Lỗi phân tích tồn kho: ${errorMsg}`,
        assistant_reply: `Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu: ${errorMsg}. Vui lòng thử lại.`,
        agent_profile: this.profile,
        data: {},
      };
    }
  }

  private buildFallbackReply(
    lotSummary: { total: number; expiringSoon: number; expired: number },
    expiringLots: number,
    expiredLots: number,
    asksExpiringSoon: boolean,
    asksExpired: boolean,
    asksRecentTransactions: boolean,
    days: number,
    insights: string[],
    userRole: UserRole,
    nearestExpiryLot?: NearestExpiryLot,
    transactionDigests: TransactionDigest[] = [],
    transactionLimit = 10,
  ): string {
    const roleGuidance = this.buildRoleGuidance(
      userRole,
      expiringLots,
      expiredLots,
      days,
    );

    if (insights.length > 0) {
      return `${insights.join(" ")} ${roleGuidance}`.trim();
    }

    if (asksRecentTransactions) {
      if (transactionDigests.length === 0) {
        return `Hiện chưa có giao dịch kho gần đây trong phạm vi truy vấn. Bạn có thể thử lại với bộ lọc thời gian khác hoặc kiểm tra quyền truy cập dữ liệu.`;
      }

      const listed = transactionDigests
        .slice(0, transactionLimit)
        .map(
          (tx, index) =>
            `${index + 1}. ${tx.happenedAt} | ${tx.type} | ${tx.materialId} | ${tx.quantity} | mã giao dịch ${tx.id}`,
        )
        .join("; ");

      return `Đây là ${Math.min(transactionLimit, transactionDigests.length)} giao dịch kho gần nhất: ${listed}`;
    }

    if (!asksExpiringSoon && !asksExpired) {
      const summaryParts: string[] = [];

      if (lotSummary.total > 0) {
        summaryParts.push(
          `Tổng quan hiện có ${lotSummary.total} lô đang theo dõi trong kho.`,
        );
      }

      summaryParts.push(
        `Trong phạm vi hiện tại có ${lotSummary.expiringSoon} lô sắp hết hạn và ${lotSummary.expired} lô đã hết hạn.`,
      );
      if (nearestExpiryLot) {
        summaryParts.push(
          `Lô gần hạn nhất là ${nearestExpiryLot.sourceId}, hết hạn vào ${this.formatDate(nearestExpiryLot.expirationDate)} (còn khoảng ${nearestExpiryLot.daysRemaining} ngày).`,
        );
      }
      summaryParts.push(roleGuidance);

      return summaryParts.join(" ").trim();
    }

    if (asksExpiringSoon && !asksExpired) {
      const nearestLotText = nearestExpiryLot
        ? `Lô gần hạn nhất hiện tại là ${nearestExpiryLot.sourceId}, sẽ hết hạn vào ${this.formatDate(nearestExpiryLot.expirationDate)} (còn khoảng ${nearestExpiryLot.daysRemaining} ngày).`
        : "";
      return `Hiện chưa ghi nhận lô sắp hết hạn trong ${days} ngày theo điều kiện truy vấn. ${nearestLotText} ${roleGuidance}`.trim();
    }

    if (asksExpired && !asksExpiringSoon) {
      const nearestLotText = nearestExpiryLot
        ? `Lô gần hạn nhất hiện tại là ${nearestExpiryLot.sourceId}, hết hạn vào ${this.formatDate(nearestExpiryLot.expirationDate)}.`
        : "";
      return `Hiện chưa ghi nhận lô đã hết hạn theo điều kiện truy vấn. ${nearestLotText} ${roleGuidance}`.trim();
    }

    return expiringLots > 0 || expiredLots > 0
      ? `Hiện có ${expiringLots} lô sắp hết hạn và ${expiredLots} lô đã hết hạn. ${roleGuidance}`.trim()
      : `Hiện chưa ghi nhận lô sắp hết hạn hoặc đã hết hạn theo phạm vi truy vấn. ${roleGuidance}`.trim();
  }

  private normalizeUserRole(inputRole: unknown): UserRole {
    if (typeof inputRole !== "string") return "unknown";

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

    return roleMap[inputRole] ?? "unknown";
  }

  private toSafeNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  private buildRoleGuidance(
    userRole: UserRole,
    expiringLots: number,
    expiredLots: number,
    days: number,
  ): string {
    const hasRiskLots = expiringLots > 0 || expiredLots > 0;

    if (userRole === "manager") {
      return hasRiskLots
        ? `Với vai trò quản lý, bạn nên chốt ưu tiên xử lý nhóm rủi ro trong kế hoạch ${days} ngày tới.`
        : "Với vai trò quản lý, bạn có thể tiếp tục duy trì ngưỡng cảnh báo định kỳ.";
    }

    if (userRole === "operator") {
      return hasRiskLots
        ? "Với vai trò vận hành, bạn nên ưu tiên xuất FIFO cho lô cận hạn và cập nhật phiếu sau thao tác."
        : "Với vai trò vận hành, bạn có thể tiếp tục quy trình xuất nhập bình thường và theo dõi hàng ngày.";
    }

    if (userRole === "quality-control") {
      return hasRiskLots
        ? "Với vai trò QC, bạn nên rà soát điều kiện bảo quản và quyết định cách ly các lô quá hạn."
        : "Với vai trò QC, bạn có thể tiếp tục kiểm tra định kỳ để xác nhận điều kiện bảo quản.";
    }

    return hasRiskLots
      ? "Bạn nên ưu tiên xử lý các lô có rủi ro hạn dùng trước để giảm thất thoát."
      : "Hiện chưa có rủi ro hạn dùng nổi bật, có thể tiếp tục theo dõi định kỳ.";
  }

  private sanitizeAssistantReply(reply?: string): string {
    if (!reply) return "";

    const lines = reply
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const blockedTokens = [
      "truy xuất",
      "tài liệu",
      "retrieval",
      "rag",
      "embedding",
      "citation",
      "semantic",
      "hybrid",
    ];

    const filtered = lines.filter((line) => {
      const normalized = line.toLowerCase();
      return !blockedTokens.some((token) => normalized.includes(token));
    });

    return filtered.join(" ").trim();
  }

  private isReplyAlignedToQuery(
    reply: string,
    asksExpiringSoon: boolean,
    asksExpired: boolean,
    asksRecentTransactions: boolean,
  ): boolean {
    const normalized = this.normalizeForMatching(reply);
    const hasExpiringSignal =
      normalized.includes("sap het han") ||
      normalized.includes("can han") ||
      normalized.includes("con han") ||
      normalized.includes("near expiry") ||
      normalized.includes("near-expiry") ||
      normalized.includes("lo gan han") ||
      normalized.includes("se het han vao") ||
      normalized.includes("expiring");
    const hasExpiredSignal =
      normalized.includes("da het han") ||
      normalized.includes("qua han") ||
      normalized.includes("het date") ||
      normalized.includes("qua date") ||
      normalized.includes("expired");
    const hasTransactionSignal =
      normalized.includes("giao dich") ||
      normalized.includes("transaction") ||
      normalized.includes("xuat") ||
      normalized.includes("nhap") ||
      normalized.includes("ma giao dich");

    if (asksRecentTransactions) {
      return hasTransactionSignal;
    }

    if (asksExpiringSoon) {
      return hasExpiringSignal && !hasExpiredSignal;
    }

    if (asksExpired) {
      return hasExpiredSignal && !hasExpiringSignal;
    }

    return (
      normalized.includes("tong quan") ||
      normalized.includes("stock overview") ||
      normalized.includes("inventory status") ||
      normalized.includes("ton kho") ||
      normalized.includes("lo dang theo doi")
    );
  }

  private isInventoryDomainQuery(query: string, action?: string): boolean {
    const normalizedAction = this.normalizeForMatching(action || "");
    if (
      normalizedAction.includes("inventory") ||
      normalizedAction.includes("report")
    )
      return true;
    const normalized = this.normalizeForMatching(query || "");
    if (!normalized) return false;
    const keywords = [
      "het han",
      "sap het han",
      "con han",
      "can han",
      "can date",
      "han dung",
      "near expiry",
      "near-expiry",
      "expired",
      "expiring",
      "het date",
      "qua date",
      "bao cao",
      "ton kho",
      "stock",
      "inventory",
      "report",
      "lot",
      "batch",
      "fifo",
      "transaction",
      "giao dich",
      "xuat nhap",
      "lich su kho",
      "recent transactions",
    ];
    return keywords.some((k) => normalized.includes(k));
  }

  private detectRecentTransactionsIntent(normalizedQuery: string): boolean {
    const keywords = [
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

    return this.containsAny(normalizedQuery, keywords);
  }

  private extractTransactionLimit(normalizedQuery: string): number {
    const matched = normalizedQuery.match(/\b(\d{1,3})\b/);
    if (!matched?.[1]) return 10;
    const parsed = Number(matched[1]);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 100) : 10;
  }

  private extractDaysWindow(normalizedQuery: string): number {
    const dayMatched = normalizedQuery.match(/(\d+)\s*(ngay|day|d)\b/);
    if (dayMatched?.[1]) {
      const parsed = Number(dayMatched[1]);
      return Number.isFinite(parsed) && parsed >= 1
        ? Math.min(parsed, 365)
        : 30;
    }

    const weekMatched = normalizedQuery.match(/(\d+)\s*(tuan|week|w)\b/);
    if (weekMatched?.[1]) {
      const parsed = Number(weekMatched[1]) * 7;
      return Number.isFinite(parsed) && parsed >= 1
        ? Math.min(parsed, 365)
        : 30;
    }

    const monthMatched = normalizedQuery.match(
      /(\d+)\s*(thang|month|months)\b/,
    );
    if (monthMatched?.[1]) {
      const parsed = Number(monthMatched[1]) * 30;
      return Number.isFinite(parsed) && parsed >= 1
        ? Math.min(parsed, 365)
        : 30;
    }

    return 30;
  }

  private detectExpiringIntent(normalizedQuery: string): boolean {
    const keywords = [
      "sap het han",
      "duoi 1 thang",
      "con han",
      "het han trong",
      "can han",
      "can date",
      "gan het han",
      "near expiry",
      "near-expiry",
      "expiring",
      "sap qua han",
      "toi han",
      "han dung",
    ];

    return this.containsAny(normalizedQuery, keywords);
  }

  private detectExpiredIntent(
    normalizedQuery: string,
    asksExpiringSoon: boolean,
  ): boolean {
    const explicitExpiredKeywords = [
      "da het han",
      "qua han",
      "expired",
      "het date",
      "qua date",
      "expire roi",
      "het hsd",
    ];

    if (this.containsAny(normalizedQuery, explicitExpiredKeywords)) {
      return true;
    }

    return normalizedQuery.includes("het han") && !asksExpiringSoon;
  }

  private normalizeForMatching(text: string): string {
    return (text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[!?.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private extractNearestExpiryLotFromCitations(
    citations: Array<{ source_id: string; preview?: string }>,
  ): NearestExpiryLot | undefined {
    const now = Date.now();
    let nearest: NearestExpiryLot | undefined;

    for (const citation of citations || []) {
      const preview = citation.preview || "";
      const matched = preview.match(/Expiration Date:\s*([0-9TZ:.-]+)/i);
      if (!matched?.[1]) continue;

      const expirationDate = matched[1];
      const timestamp = Date.parse(expirationDate);
      if (!Number.isFinite(timestamp) || timestamp < now) continue;

      const daysRemaining = Math.ceil(
        (timestamp - now) / (1000 * 60 * 60 * 24),
      );
      if (daysRemaining < 0) continue;

      const candidate: NearestExpiryLot = {
        sourceId: citation.source_id || "N/A",
        expirationDate,
        daysRemaining,
      };

      if (!nearest || candidate.daysRemaining < nearest.daysRemaining) {
        nearest = candidate;
      }
    }

    return nearest;
  }

  private formatDate(dateText: string): string {
    const parsed = new Date(dateText);
    if (Number.isNaN(parsed.getTime())) return dateText;
    return parsed.toLocaleDateString("vi-VN");
  }

  private extractTransactionDigests(
    transactions: unknown,
    limit: number,
  ): TransactionDigest[] {
    if (!Array.isArray(transactions)) {
      return [];
    }

    return transactions.slice(0, limit).map((item) => {
      const tx = typeof item === "object" && item !== null ? item : {};
      const record = tx as Record<string, unknown>;

      const id =
        this.toStringValue(record.transaction_id) ||
        this.toStringValue(record.id) ||
        "N/A";
      const type =
        this.toStringValue(record.transaction_type) ||
        this.toStringValue(record.type) ||
        "UNKNOWN";
      const materialId =
        this.toStringValue(record.material_id) ||
        this.toStringValue(record.lot_id) ||
        "N/A";
      const quantityRaw =
        this.toStringValue(record.quantity) ||
        this.toStringValue(record.amount);
      const unit =
        this.toStringValue(record.unit_of_measure) ||
        this.toStringValue(record.unit) ||
        "";
      const happenedAtRaw =
        this.toStringValue(record.transaction_date) ||
        this.toStringValue(record.created_date) ||
        this.toStringValue(record.modified_date) ||
        "N/A";

      return {
        id,
        type,
        materialId,
        quantity: `${quantityRaw || "N/A"}${unit ? ` ${unit}` : ""}`.trim(),
        happenedAt:
          happenedAtRaw !== "N/A" ? this.formatDateTime(happenedAtRaw) : "N/A",
      };
    });
  }

  private toStringValue(value: unknown): string {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
  }

  private formatDateTime(dateText: string): string {
    const parsed = new Date(dateText);
    if (Number.isNaN(parsed.getTime())) return dateText;
    return parsed.toLocaleString("vi-VN");
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }
}
