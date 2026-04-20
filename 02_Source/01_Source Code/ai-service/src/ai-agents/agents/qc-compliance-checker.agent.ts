import { Injectable } from "@nestjs/common";
import { BackendDataService } from "../../backend-client/backend-data.service";
import { AgentLlmService } from "../services/agent-llm.service";
import type {
  AgentHandlerInput,
  AgentHandlerOutput,
  AgentProfile,
} from "../ai-agents.types";

@Injectable()
export class QcComplianceCheckerAgent {
  private readonly profile: AgentProfile = {
    name: "QC Compliance Checker",
    description:
      "Đánh giá tuân thủ QC, kết quả kiểm tra chất lượng, và cảnh báo liên quan.",
    instructions: [
      "Chỉ trả lời các yêu cầu thuộc lĩnh vực QC/compliance.",
      "Nếu thiếu dữ liệu bắt buộc khi submit quyết định QC thì yêu cầu bổ sung.",
      "Trả lời tiếng Việt tự nhiên, rõ ràng và không suy diễn ngoài dữ liệu.",
    ],
    model: "gemini-2.5-flash",
    tools: [
      "BackendDataService.submitQCDecision",
      "BackendDataService.getDashboardKPI",
      "BackendDataService.getSupplierPerformance",
    ],
  };

  constructor(
    private readonly backendDataService: BackendDataService,
    private readonly agentLlmService: AgentLlmService,
  ) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    try {
      const action = (input.action || "").toLowerCase();

      if (!this.isQcDomainQuery(input.query, action)) {
        return {
          status: "needs_input",
          message:
            "QC Compliance Checker only handles QC/compliance queries and submit_decision action.",
          data: {
            supportedActions: ["submit_decision"],
            supportedTopics: [
              "kết quả QC",
              "tuân thủ chất lượng",
              "tỷ lệ lỗi QC",
            ],
          },
        };
      }

      if (action === "submit_decision") {
        const lotId = String(input.payload?.lot_id ?? "");
        const decision = String(input.payload?.decision ?? "") as
          | "Accepted"
          | "Rejected"
          | "Hold";
        const verifiedBy = String(input.payload?.verified_by ?? "");
        const rejectReason =
          typeof input.payload?.reject_reason === "string"
            ? input.payload.reject_reason
            : undefined;

        if (!lotId || !decision || !verifiedBy) {
          return {
            status: "needs_input",
            message:
              "submit_decision requires lot_id, decision and verified_by.",
            data: {
              expectedFields: [
                "lot_id",
                "decision",
                "verified_by",
                "reject_reason?",
              ],
            },
          };
        }

        const result = await this.backendDataService.submitQCDecision(lotId, {
          decision,
          verified_by: verifiedBy,
          reject_reason: rejectReason,
        });

        return {
          status: "ok",
          message: "QC decision submitted successfully.",
          assistant_reply:
            (await this.agentLlmService.generateReply(
              this.profile,
              input.query,
              result as Record<string, unknown>,
            )) || "Đã ghi nhận quyết định QC thành công.",
          agent_profile: this.profile,
          data: result as Record<string, unknown>,
        };
      }

      const [dashboard, supplierPerformance] = await Promise.all([
        this.backendDataService.getDashboardKPI(),
        this.backendDataService.getSupplierPerformance(),
      ]);

      const alerts: string[] = [];
      if ((dashboard as any).error_rate >= 10) {
        alerts.push(
          "Tỷ lệ lỗi QC đang cao (>= 10%). Cần kiểm tra thêm lô đầu vào và nhà cung cấp.",
        );
      }
      if ((dashboard as any).pending_count > 0) {
        alerts.push(
          `Hiện còn ${(dashboard as any).pending_count} lô chưa có quyết định QC.`,
        );
      }

      const contextData = {
        query: input.query,
        dashboard,
        supplier_performance: supplierPerformance,
        alerts,
      };

      const generatedReply = await this.agentLlmService.generateReply(
        this.profile,
        input.query,
        contextData as any,
      );
      const assistantReply =
        this.sanitizeQcReply(generatedReply) ||
        this.buildQcFallbackReply(contextData);

      return {
        status: "ok",
        message: "QC compliance snapshot generated successfully.",
        assistant_reply: assistantReply,
        agent_profile: this.profile,
        data: contextData as any,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        status: "error",
        message: `Lỗi xử lý QC: ${errorMsg}`,
        assistant_reply: `Xin lỗi, tôi gặp lỗi: ${errorMsg}. Vui lòng thử lại.`,
        agent_profile: this.profile,
        data: {},
      };
    }
  }

  private isQcDomainQuery(query: string, action: string): boolean {
    if (action === "submit_decision") return true;
    const normalized = (query || "")
      .toLowerCase()
      .replace(/[!?.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) return false;
    const keywords = [
      "qc",
      "quality",
      "compliance",
      "kiem tra",
      "kiểm tra",
      "chat luong",
      "chất lượng",
      "reject",
      "accepted",
      "hold",
    ];
    return keywords.some((k) => normalized.includes(k));
  }

  private sanitizeQcReply(reply?: string): string {
    if (!reply) return "";

    const normalized = reply.toLowerCase();
    const genericTokens = [
      "xem chi tiết",
      "dữ liệu đi kèm",
      "du lieu di kem",
      "đính kèm",
    ];

    if (genericTokens.some((token) => normalized.includes(token))) {
      return "";
    }

    return reply.trim();
  }

  private buildQcFallbackReply(contextData: {
    dashboard: {
      pending_count: number;
      approved_count: number;
      rejected_count: number;
      error_rate: number;
    };
    supplier_performance: unknown[];
    alerts: string[];
  }): string {
    const dashboard = contextData.dashboard;
    const suppliers = (contextData.supplier_performance || []).map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        supplier_name: String(row.supplier_name ?? ""),
        quality_rate: Number(row.quality_rate ?? 0),
      };
    });

    const lowestSupplier = [...suppliers].sort(
      (a, b) => (a.quality_rate ?? 100) - (b.quality_rate ?? 100),
    )[0];

    const parts: string[] = [];
    parts.push(
      `QC hiện có ${dashboard.pending_count} lô chờ duyệt, ${dashboard.rejected_count} lô bị từ chối và ${dashboard.approved_count} lô đã đạt.`,
    );

    if ((dashboard.error_rate ?? 0) > 0) {
      parts.push(
        `Tỷ lệ lỗi QC hiện tại khoảng ${dashboard.error_rate.toFixed(1)}%.`,
      );
    }

    if (lowestSupplier?.supplier_name) {
      parts.push(
        `Nhà cung cấp cần theo dõi ưu tiên là ${lowestSupplier.supplier_name} với tỷ lệ đạt ${Number(lowestSupplier.quality_rate ?? 0).toFixed(1)}%.`,
      );
    }

    if (contextData.alerts.length > 0) {
      parts.push(`Cảnh báo chính: ${contextData.alerts[0]}`);
    }

    parts.push(
      "Đề xuất: xử lý các lô pending trước, sau đó tập trung kiểm tra nguyên nhân tại nhóm có tỷ lệ đạt thấp.",
    );
    return parts.join(" ");
  }
}
