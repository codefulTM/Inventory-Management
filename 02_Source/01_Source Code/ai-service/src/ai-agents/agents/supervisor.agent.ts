// Supervisor Agent - Agent giám sát điều hướng yêu cầu tới agent chuyên biệt
// Chức năng: Phân loại intent (ý định) và điều hướng tới:
// - InventoryAnalystAgent: Phân tích tồn kho, hạn dùng
// - WarehouseOperatorAgent: Thao tác kho (tạo lô, barcode, gán kho)
// - QcComplianceCheckerAgent: Kiểm tra QC và tuân thủ
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AgentHandlerOutput,
  AgentHandlerInput,
  AgentIntent,
  AgentRouteResult,
} from "../ai-agents.types";
import { InventoryAnalystAgent } from "./inventory-analyst.agent";
import { WarehouseOperatorAgent } from "./warehouse-operator.agent";
import { QcComplianceCheckerAgent } from "./qc-compliance-checker.agent";

// Interface kết quả phân loại intent
interface RoutingDecision {
  intent: AgentIntent; // Intent đã phân loại
  confidence: number; // Độ tin cậy (0-1)
  reason: string; // Lý do phân loại
}

// Ngưỡng độ tin cậy để chấp nhận intent từ AI (70%)
const ROUTING_CONFIDENCE_THRESHOLD = 0.7;
// Timeout cho Gemini router (7 giây)
const GEMINI_ROUTER_TIMEOUT_MS = 7000;
// Thông báo fallback khi không thể xử lý yêu cầu
const FALLBACK_MESSAGE =
  "Xin lỗi, yêu cầu này hiện chưa được hỗ trợ. Vui lòng liên hệ hotro@gmail.com để được hỗ trợ thêm.";

@Injectable()
export class SupervisorAgent {
  private readonly logger = new Logger(SupervisorAgent.name);

  constructor(
    private readonly configService: ConfigService, // Đọc cấu hình Gemini
    private readonly inventoryAnalystAgent: InventoryAnalystAgent, // Agent phân tích tồn kho
    private readonly warehouseOperatorAgent: WarehouseOperatorAgent, // Agent thao tác kho
    private readonly qcComplianceCheckerAgent: QcComplianceCheckerAgent, // Agent QC
  ) {}

  // Phương thức chính: Điều hướng yêu cầu tới agent phù hợp
  // Quy trình: Kiểm tra chào hỏi -> Phân loại intent (AI + heuristic) -> Điều hướng
  async route(input: AgentHandlerInput): Promise<AgentRouteResult> {
    try {
      // Chuẩn hóa query (bỏ dấu tiếng Việt, lowercase) để dễ so khớp
      const normalizedQuery = this.normalizeText(input.query);

      // Kiểm tra nếu là lời chào hỏi thì trả về danh sách hỗ trợ
      if (this.isGreeting(normalizedQuery)) {
        return this.buildRouteResult(
          AgentIntent.UNKNOWN,
          1,
          "Greeting query handled by supervisor.",
          {
            status: "ok",
            message: "Greeting handled by supervisor.",
            assistant_reply:
              "Xin chào. Tôi có thể hỗ trợ các nghiệp vụ: phân tích tồn kho, thao tác kho, và kiểm tra QC.",
            data: {
              supported_intents: [
                AgentIntent.INVENTORY_ANALYST,
                AgentIntent.WAREHOUSE_OPERATOR,
                AgentIntent.QC_COMPLIANCE_CHECKER,
              ],
            },
          },
        );
      }

      // Bước 1: Dùng AI (Gemini) để phân loại intent
      const llmDecision = await this.classifyIntent(input.query, input.action);

      // Bước 2: Dùng heuristic (từ khóa) làm fallback nếu AI không chắc chắn
      const fallbackHintDecision = this.deriveIntentFromDomainHints(
        normalizedQuery,
        input.action,
      );

      // Chọn quyết định: Nếu AI confidence thấp (<70%) thì dùng heuristic
      const decision =
        llmDecision.intent === AgentIntent.UNKNOWN ||
        llmDecision.confidence < ROUTING_CONFIDENCE_THRESHOLD
          ? fallbackHintDecision || llmDecision
          : llmDecision;

      // Nếu vẫn không xác định được intent -> trả về fallback
      if (
        decision.intent === AgentIntent.UNKNOWN ||
        decision.confidence < ROUTING_CONFIDENCE_THRESHOLD
      ) {
        return this.buildFallbackResult(decision.reason, decision.confidence);
      }

      // Bước 3: Điều hướng tới agent chuyên biệt tương ứng
      let result: AgentHandlerOutput;
      // Suy luận action nếu người dùng chỉ nhập query mà không chỉ định action
      const routedInput = this.inferActionIfMissing(input, decision.intent);

      // Switch-case điều hướng tới đúng agent
      switch (decision.intent) {
        case AgentIntent.WAREHOUSE_OPERATOR:
          result = await this.warehouseOperatorAgent.handle(routedInput);
          break;
        case AgentIntent.QC_COMPLIANCE_CHECKER:
          result = await this.qcComplianceCheckerAgent.handle(routedInput);
          break;
        case AgentIntent.INVENTORY_ANALYST:
          result = await this.inventoryAnalystAgent.handle(routedInput);
          break;
        default:
          return this.buildFallbackResult(
            "Unknown intent received after classification.",
            decision.confidence,
          );
      }

      // Trả về kết quả sau khi agent đã xử lý
      return this.buildRouteResult(
        decision.intent,
        decision.confidence,
        decision.reason,
        result,
      );
    } catch (error) {
      // Xử lý lỗi không mong muốn
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Supervisor agent route error: ${errorMsg}`, error);
      return this.buildFallbackResult(
        `Supervisor routing error: ${errorMsg}`,
        0,
      );
    }
  }

  // Phân loại intent sử dụng Gemini AI
  // Chỉ chạy khi USE_GEMINI_ROUTER=true và có GOOGLE_API_KEY
  private async classifyIntent(
    query: string,
    action?: string,
  ): Promise<RoutingDecision> {
    const aiRoutingEnabled =
      this.configService.get<string>("USE_GEMINI_ROUTER") === "true";
    const apiKey = this.configService.get<string>("GOOGLE_API_KEY");

    // Nếu không bật AI routing hoặc thiếu API key thì trả về UNKNOWN
    if (!aiRoutingEnabled || !apiKey)
      return {
        intent: AgentIntent.UNKNOWN,
        confidence: 0,
        reason: "Gemini router is not configured or disabled.",
      };

    // Thử gọi Gemini để phân loại
    const aiDecision = await this.tryGeminiClassification(
      query,
      action,
      apiKey,
    );

    // Nếu Gemini trả về kết quả hợp lệ thì dùng, ngược lại trả về UNKNOWN
    if (aiDecision) return aiDecision;
    return {
      intent: AgentIntent.UNKNOWN,
      confidence: 0,
      reason: "Gemini classifier returned invalid output.",
    };
  }

  // Gọi Gemini API để phân loại intent
  // Trả về: intent, confidence (0-1), và reason
  private async tryGeminiClassification(
    query: string,
    action: string | undefined,
    apiKey: string,
  ): Promise<RoutingDecision | null> {
    try {
      // Lấy tên model từ config hoặc dùng mặc định gemini-2.5-flash
      const model =
        this.configService.get<string>("GEMINI_ROUTER_MODEL") ||
        "gemini-2.5-flash";

      // Tạo prompt cho Gemini để phân loại intent
      const prompt = [
        "You are an intent classifier for an inventory management system.",
        "Your task is to classify the user request into exactly one intent label.",
        `Allowed intents: ${AgentIntent.INVENTORY_ANALYST}, ${AgentIntent.WAREHOUSE_OPERATOR}, ${AgentIntent.QC_COMPLIANCE_CHECKER}, ${AgentIntent.UNKNOWN}`,
        "Use unknown for out-of-domain, greeting-only, generic chit-chat, or ambiguous requests.",
        "Return ONLY strict JSON (no markdown, no extra text) in this format:",
        '{"intent":"inventory_analyst|warehouse_operator|qc_compliance_checker|unknown","confidence":0.0,"reason":"short reason"}',
        `action: ${action || ""}`,
        `query: ${query}`,
      ].join("\n");

      // Cấu hình timeout cho request (7 giây)
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        GEMINI_ROUTER_TIMEOUT_MS,
      );

      // Gọi Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 120 }, // temperature=0 để kết quả nhất quán
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      // Kiểm tra HTTP status
      if (!response.ok) {
        this.logger.warn(
          `Gemini routing failed with status ${response.status}`,
        );
        return null;
      }

      // Parse phản hồi từ Gemini
      const payload: unknown = await response.json();
      const payloadObj =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : null;
      const candidates = Array.isArray(payloadObj?.candidates)
        ? (payloadObj?.candidates as Array<Record<string, unknown>>)
        : [];
      const text: string | undefined = (
        (
          (candidates[0] as Record<string, unknown>)?.content as Record<
            string,
            unknown
          >
        )?.parts as Array<Record<string, unknown>>
      )?.[0]?.text as string | undefined;
      if (!text) return null;

      // Parse JSON từ text phản hồi
      const parsed = JSON.parse(this.extractJson(text)) as {
        intent: AgentIntent;
        confidence: number;
        reason: string;
      };

      // Kiểm tra intent có hợp lệ không
      if (!Object.values(AgentIntent).includes(parsed.intent)) return null;

      // Trả về kết quả (chuẩn hóa confidence về [0, 1])
      return {
        intent: parsed.intent,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        reason: parsed.reason || "Gemini classification",
      };
    } catch (error) {
      // Xử lý timeout
      if (error instanceof Error && error.name === "AbortError") {
        this.logger.warn("Gemini classification timed out.");
        return null;
      }
      this.logger.warn(
        `Gemini classification parsing failed: ${String(error)}`,
      );
      return null;
    }
  }

  // Tạo kết quả fallback khi không thể xử lý yêu cầu
  private buildFallbackResult(
    reason: string,
    confidence: number,
  ): AgentRouteResult {
    return this.buildRouteResult(AgentIntent.UNKNOWN, confidence, reason, {
      status: "needs_input",
      message: "Unsupported request.",
      assistant_reply: FALLBACK_MESSAGE, // Thông báo lỗi chuẩn
      data: { support_email: "hotro@gmail.com" },
    });
  }

  // Tạo kết quả route chuẩn
  private buildRouteResult(
    intent: AgentIntent,
    confidence: number,
    reason: string,
    result: AgentHandlerOutput,
  ): AgentRouteResult {
    return {
      intent,
      confidence,
      reason,
      result,
      timestamp: new Date().toISOString(), // Thời điểm xử lý
    };
  }

  // Chuẩn hóa văn bản: bỏ dấu tiếng Việt, lowercase, chuẩn hóa khoảng trắng
  private normalizeText(text: string): string {
    return (text || "")
      .normalize("NFD") // Tách dấu khỏi ký tự
      .replace(/[\u0300-\u036f]/g, "") // Xóa các dấu
      .replace(/đ/g, "d") // Chuyển đ -> d
      .replace(/Đ/g, "D") // Chuyển Đ -> D
      .toLowerCase() // Chuyển về chữ thường
      .replace(/[!?.,]/g, " ") // Thay dấu câu bằng khoảng trắng
      .replace(/\s+/g, " ") // Gộp nhiều khoảng trắng thành 1
      .trim(); // Xóa khoảng trắng đầu/cuối
  }

  // Kiểm tra xem query có phải là lời chào hỏi không
  private isGreeting(normalizedText: string): boolean {
    if (!normalizedText) return false;
    return new Set(["xin chao", "chao", "hello", "hi", "hey", "alo"]).has(
      normalizedText,
    );
  }

  // Suy luận intent từ từ khóa miền (domain hints) - Dùng làm fallback cho AI
  private deriveIntentFromDomainHints(
    normalizedQuery: string,
    action?: string,
  ): RoutingDecision | null {
    // Kết hợp action và query để tìm từ khóa
    const combined =
      `${this.normalizeText(action || "")} ${normalizedQuery}`.trim();
    if (!combined) return null;

    // Danh sách từ khóa cho Warehouse Operator
    const warehouseHints = [
      "nhap lo", "nhập lô", "nhap kho", "nhập kho",
      "tao lo", "tạo lô", "gan kho", "gán kho",
      "assign warehouse", "generate barcode",
      "create_lot", "assign_warehouse", "generate_barcode",
    ];

    // Danh sách từ khóa cho Inventory Analyst
    const inventoryHints = [
      "sap het han", "het han", "ton kho", "bao cao ton",
      "tong quan ton kho", "con han", "can han", "can date",
      "han dung", "duoi 1 thang", "gan het han", "het date",
      "qua date", "stock", "stock overview", "inventory status",
      "near expiry", "near-expiry", "inventory", "expiry",
      "expiring", "expired", "batch", "fifo", "transaction",
      "giao dich", "xuat nhap", "lich su kho", "recent transactions",
    ];

    // Danh sách từ khóa cho QC Compliance Checker
    const qcHints = [
      "qc", "quality", "compliance",
      "kiem tra chat luong", "kiểm tra chất lượng",
      "submit_decision", "reject", "hold", "accepted",
    ];

    // Kiểm tra từng nhóm từ khóa
    if (warehouseHints.some((h) => combined.includes(h)))
      return {
        intent: AgentIntent.WAREHOUSE_OPERATOR,
        confidence: ROUTING_CONFIDENCE_THRESHOLD, // 0.7
        reason: "Resolved by domain hints for warehouse operations.",
      };
    if (inventoryHints.some((h) => combined.includes(h)))
      return {
        intent: AgentIntent.INVENTORY_ANALYST,
        confidence: ROUTING_CONFIDENCE_THRESHOLD,
        reason: "Resolved by domain hints for inventory analytics.",
      };
    if (qcHints.some((h) => combined.includes(h)))
      return {
        intent: AgentIntent.QC_COMPLIANCE_CHECKER,
        confidence: ROUTING_CONFIDENCE_THRESHOLD,
        reason: "Resolved by domain hints for QC/compliance.",
      };

    // Không tìm thấy từ khóa phù hợp
    return null;
  }

  // Suy luận action nếu người dùng chỉ nhập query mà không chỉ định action
  private inferActionIfMissing(
    input: AgentHandlerInput,
    intent: AgentIntent,
  ): AgentHandlerInput {
    // Nếu đã có action thì giữ nguyên
    if (input.action && input.action.trim().length > 0) return input;

    const normalized = this.normalizeText(input.query);

    // Suy luận action cho Warehouse Operator
    if (intent === AgentIntent.WAREHOUSE_OPERATOR) {
      if (
        normalized.includes("tao lo") || normalized.includes("tạo lô") ||
        normalized.includes("nhap lo") || normalized.includes("nhập lô")
      )
        return { ...input, action: "create_lot" };
      if (normalized.includes("barcode") || normalized.includes("ma vach"))
        return { ...input, action: "generate_barcode" };
      if (
        normalized.includes("gan kho") || normalized.includes("gán kho") ||
        normalized.includes("storage location")
      )
        return { ...input, action: "assign_warehouse" };
    }

    // Suy luận action cho QC Compliance Checker
    if (
      intent === AgentIntent.QC_COMPLIANCE_CHECKER &&
      (normalized.includes("submit") || normalized.includes("duyet qc") || normalized.includes("duyệt qc"))
    )
      return { ...input, action: "submit_decision" };

    return input;
  }

  // Trích xuất JSON từ phản hồi (hỗ trợ raw JSON và markdown code block)
  private extractJson(rawText: string): string {
    const trimmed = rawText.trim();
    // Nếu đã là JSON hợp lệ
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
    // Thử tìm trong markdown code block
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) return fenced[1].trim();
    // Tìm dấu ngoặc nhọn đầu và cuối
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
    return trimmed;
  }
}
