// QC Compliance Checker Agent - Agent kiểm tra chất lượng và tuân thủ
// Chức năng: Submit quyết định QC (Accepted/Rejected/Hold), xem dashboard KPI,
// phân tích hiệu suất nhà cung cấp
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
  // Hồ sơ agent: định nghĩa tên, mô tả, instructions và tools
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
      // Các công cụ agent có thể sử dụng
      "BackendDataService.submitQCDecision", // Submit quyết định QC
      "BackendDataService.getDashboardKPI", // Lấy chỉ số KPI dashboard
      "BackendDataService.getSupplierPerformance", // Lấy hiệu suất NCC
    ],
  };

  constructor(
    // Service gọi backend qua gRPC
    private readonly backendDataService: BackendDataService,
    // Service gọi Gemini để sinh phản hồi tự nhiên
    private readonly agentLlmService: AgentLlmService,
  ) {}

  // Phương thức chính xử lý yêu cầu QC và tuân thủ
  // Hỗ trợ: submit_decision (submit quyết định QC) và xem dashboard KPI
  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    try {
      const action = (input.action || "").toLowerCase();

      // Kiểm tra xem có thuộc miền QC không
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

      // Xử lý submit quyết định QC (Accepted/Rejected/Hold)
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

        // Kiểm tra tham số bắt buộc
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
                "reject_reason?", // Tùy chọn
              ],
            },
          };
        }

        // Gọi backend để submit quyết định
        const result = await this.backendDataService.submitQCDecision(lotId, {
          decision,
          verified_by: verifiedBy,
          reject_reason: rejectReason,
        });

        // Trả về kết quả và sinh phản hồi từ LLM
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

      // Xử lý xem dashboard KPI và hiệu suất NCC
      const [dashboard, supplierPerformance] = await Promise.all([
        this.backendDataService.getDashboardKPI(),
        this.backendDataService.getSupplierPerformance(),
      ]);

      // Tạo cảnh báo dựa trên dữ liệu
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

      // Tổng hợp dữ liệu ngữ cảnh
      const contextData = {
        query: input.query,
        dashboard,
        supplier_performance: supplierPerformance,
        alerts,
      };

      // Sinh phản hồi từ LLM hoặc dùng fallback
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

  // Kiểm tra xem query có thuộc miền QC/compliance không
  private isQcDomainQuery(query: string, action: string): boolean {
    // Nếu action là submit_decision thì chấp nhận luôn
    if (action === "submit_decision") return true;
    const normalized = (query || "")
      .toLowerCase()
      .replace(/[!?.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) return false;
    // Danh sách từ khóa miền QC
    const keywords = [
      "qc", "quality", "compliance",
      "kiem tra", "kiểm tra", "chat luong", "chất lượng",
      "reject", "accepted", "hold",
    ];
    return keywords.some((k) => normalized.includes(k));
  }

  // Làm sạch phản hồi QC: Lọc bỏ các câu chung chung
  private sanitizeQcReply(reply?: string): string {
    if (!reply) return "";

    const normalized = reply.toLowerCase();
    // Các từ khóa chỉ báo phản hồi quá chung chung
    const genericTokens = [
      "xem chi tiết", "dữ liệu đi kèm", "du lieu di kem", "đính kèm",
    ];

    // Nếu chứa từ khóa này thì bỏ qua, dùng fallback
    if (genericTokens.some((token) => normalized.includes(token))) {
      return "";
    }

    return reply.trim();
  }

  // Tạo phản hồi dự phòng cho QC từ dữ liệu dashboard
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
    // Xử lý danh sách nhà cung cấp
    const suppliers = (contextData.supplier_performance || []).map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        supplier_name: String(row.supplier_name ?? ""),
        quality_rate: Number(row.quality_rate ?? 0),
      };
    });

    // Tìm NCC có tỷ lệ đạt thấp nhất
    const lowestSupplier = [...suppliers].sort(
      (a, b) => (a.quality_rate ?? 100) - (b.quality_rate ?? 100),
    )[0];

    const parts: string[] = [];
    // Thông tin tổng quan dashboard
    parts.push(
      `QC hiện có ${dashboard.pending_count} lô chờ duyệt, ${dashboard.rejected_count} lô bị từ chối và ${dashboard.approved_count} lô đã đạt.`,
    );

    // Tỷ lệ lỗi
    if ((dashboard.error_rate ?? 0) > 0) {
      parts.push(
        `Tỷ lệ lỗi QC hiện tại khoảng ${dashboard.error_rate.toFixed(1)}%.`,
      );
    }

    // NCC cần theo dõi
    if (lowestSupplier?.supplier_name) {
      parts.push(
        `Nhà cung cấp cần theo dõi ưu tiên là ${lowestSupplier.supplier_name} với tỷ lệ đạt ${Number(lowestSupplier.quality_rate ?? 0).toFixed(1)}%.`,
      );
    }

    // Cảnh báo chính
    if (contextData.alerts.length > 0) {
      parts.push(`Cảnh báo chính: ${contextData.alerts[0]}`);
    }

    // Đề xuất hành động
    parts.push(
      "Đề xuất: xử lý các lô pending trước, sau đó tập trung kiểm tra nguyên nhân tại nhóm có tỷ lệ đạt thấp.",
    );
    return parts.join(" ");
  }
}
