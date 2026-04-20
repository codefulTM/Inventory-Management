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

      const [lotStats, transactions] = await Promise.all([
        this.backendDataService.getLotsStatistics(),
        this.backendDataService.getTransactions(page, limit),
      ]);

      const requestedDaysWindow = this.extractDaysWindow(normalizedQuery);
      const asksExpiringSoon =
        normalizedQuery.includes("sap het han") ||
        normalizedQuery.includes("duoi 1 thang") ||
        normalizedQuery.includes("con han") ||
        normalizedQuery.includes("het han trong") ||
        normalizedQuery.includes("can han") ||
        normalizedQuery.includes("expiring");

      const asksExpired =
        normalizedQuery.includes("da het han") ||
        normalizedQuery.includes("qua han") ||
        (normalizedQuery.includes("het han") && !asksExpiringSoon) ||
        normalizedQuery.includes("expired");

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
        pagination: {
          page,
          limit,
          total: (transactions as any).total,
          totalPages: Math.ceil((transactions as any).total / limit),
        },
        retrieval: {
          total: retrieval.total,
          mode: retrieval.search_mode,
          used_embedding: retrieval.used_embedding,
          disabled_reason: retrieval.disabled_reason,
          highlights: retrievalHighlights,
          citations: retrievalCitations,
        },
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
        );

      const assistantReply = shouldUseSanitizedReply
        ? sanitizedReply
        : this.buildFallbackReply(
            lotSummary,
            expiringLots.length,
            expiredLots.length,
            asksExpiringSoon,
            asksExpired,
            requestedDaysWindow,
            insights,
            userRole,
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
    days: number,
    insights: string[],
    userRole: UserRole,
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
      summaryParts.push(roleGuidance);

      return summaryParts.join(" ").trim();
    }

    if (asksExpiringSoon && !asksExpired)
      return `Hiện chưa ghi nhận lô sắp hết hạn trong ${days} ngày theo điều kiện truy vấn. ${roleGuidance}`.trim();

    if (asksExpired && !asksExpiringSoon)
      return `Hiện chưa ghi nhận lô đã hết hạn theo điều kiện truy vấn. ${roleGuidance}`.trim();

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
  ): boolean {
    const normalized = this.normalizeForMatching(reply);
    const hasExpiringSignal =
      normalized.includes("sap het han") ||
      normalized.includes("can han") ||
      normalized.includes("con han") ||
      normalized.includes("expiring");
    const hasExpiredSignal =
      normalized.includes("da het han") ||
      normalized.includes("qua han") ||
      normalized.includes("expired");

    if (asksExpiringSoon) {
      return hasExpiringSignal && !hasExpiredSignal;
    }

    if (asksExpired) {
      return hasExpiredSignal && !hasExpiringSignal;
    }

    return (
      normalized.includes("tong quan") ||
      normalized.includes("tong quan") ||
      normalized.includes("ton kho") ||
      normalized.includes("ton kho")
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
      "bao cao",
      "ton kho",
      "inventory",
      "report",
      "lot",
      "transaction",
      "giao dich",
    ];
    return keywords.some((k) => normalized.includes(k));
  }

  private extractDaysWindow(normalizedQuery: string): number {
    const matched = normalizedQuery.match(/(\d+)\s*ngay/);
    if (!matched?.[1]) return 30;
    const parsed = Number(matched[1]);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 365) : 30;
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
}
