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

interface RoutingDecision {
  intent: AgentIntent;
  confidence: number;
  reason: string;
}

const ROUTING_CONFIDENCE_THRESHOLD = 0.7;
const GEMINI_ROUTER_TIMEOUT_MS = 7000;
const FALLBACK_MESSAGE =
  "Xin lỗi, yêu cầu này hiện chưa được hỗ trợ. Vui lòng liên hệ hotro@gmail.com để được hỗ trợ thêm.";

@Injectable()
export class SupervisorAgent {
  private readonly logger = new Logger(SupervisorAgent.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly inventoryAnalystAgent: InventoryAnalystAgent,
    private readonly warehouseOperatorAgent: WarehouseOperatorAgent,
    private readonly qcComplianceCheckerAgent: QcComplianceCheckerAgent,
  ) {}

  async route(input: AgentHandlerInput): Promise<AgentRouteResult> {
    try {
      const normalizedQuery = this.normalizeText(input.query);
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

      const llmDecision = await this.classifyIntent(input.query, input.action);
      const fallbackHintDecision = this.deriveIntentFromDomainHints(
        normalizedQuery,
        input.action,
      );
      const decision =
        llmDecision.intent === AgentIntent.UNKNOWN ||
        llmDecision.confidence < ROUTING_CONFIDENCE_THRESHOLD
          ? fallbackHintDecision || llmDecision
          : llmDecision;

      if (
        decision.intent === AgentIntent.UNKNOWN ||
        decision.confidence < ROUTING_CONFIDENCE_THRESHOLD
      ) {
        return this.buildFallbackResult(decision.reason, decision.confidence);
      }

      let result: AgentHandlerOutput;
      const routedInput = this.inferActionIfMissing(input, decision.intent);
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

      return this.buildRouteResult(
        decision.intent,
        decision.confidence,
        decision.reason,
        result,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Supervisor agent route error: ${errorMsg}`, error);
      return this.buildFallbackResult(
        `Supervisor routing error: ${errorMsg}`,
        0,
      );
    }
  }

  private async classifyIntent(
    query: string,
    action?: string,
  ): Promise<RoutingDecision> {
    const aiRoutingEnabled =
      this.configService.get<string>("USE_GEMINI_ROUTER") === "true";
    const apiKey = this.configService.get<string>("GOOGLE_API_KEY");
    if (!aiRoutingEnabled || !apiKey)
      return {
        intent: AgentIntent.UNKNOWN,
        confidence: 0,
        reason: "Gemini router is not configured or disabled.",
      };
    const aiDecision = await this.tryGeminiClassification(
      query,
      action,
      apiKey,
    );
    if (aiDecision) return aiDecision;
    return {
      intent: AgentIntent.UNKNOWN,
      confidence: 0,
      reason: "Gemini classifier returned invalid output.",
    };
  }

  private async tryGeminiClassification(
    query: string,
    action: string | undefined,
    apiKey: string,
  ): Promise<RoutingDecision | null> {
    try {
      const model =
        this.configService.get<string>("GEMINI_ROUTER_MODEL") ||
        "gemini-2.5-flash";
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

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        GEMINI_ROUTER_TIMEOUT_MS,
      );
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 120 },
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      if (!response.ok) {
        this.logger.warn(
          `Gemini routing failed with status ${response.status}`,
        );
        return null;
      }

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

      const parsed = JSON.parse(this.extractJson(text)) as {
        intent: AgentIntent;
        confidence: number;
        reason: string;
      };
      if (!Object.values(AgentIntent).includes(parsed.intent)) return null;
      return {
        intent: parsed.intent,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        reason: parsed.reason || "Gemini classification",
      };
    } catch (error) {
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

  private buildFallbackResult(
    reason: string,
    confidence: number,
  ): AgentRouteResult {
    return this.buildRouteResult(AgentIntent.UNKNOWN, confidence, reason, {
      status: "needs_input",
      message: "Unsupported request.",
      assistant_reply: FALLBACK_MESSAGE,
      data: { support_email: "hotro@gmail.com" },
    });
  }

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
      timestamp: new Date().toISOString(),
    };
  }

  private normalizeText(text: string): string {
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

  private isGreeting(normalizedText: string): boolean {
    if (!normalizedText) return false;
    return new Set(["xin chao", "chao", "hello", "hi", "hey", "alo"]).has(
      normalizedText,
    );
  }

  private deriveIntentFromDomainHints(
    normalizedQuery: string,
    action?: string,
  ): RoutingDecision | null {
    const combined =
      `${this.normalizeText(action || "")} ${normalizedQuery}`.trim();
    if (!combined) return null;
    const warehouseHints = [
      "nhap lo",
      "nhập lô",
      "nhap kho",
      "nhập kho",
      "tao lo",
      "tạo lô",
      "gan kho",
      "gán kho",
      "assign warehouse",
      "generate barcode",
      "create_lot",
      "assign_warehouse",
      "generate_barcode",
    ];
    const inventoryHints = [
      "sap het han",
      "het han",
      "ton kho",
      "bao cao ton",
      "tong quan ton kho",
      "con han",
      "can han",
      "can date",
      "han dung",
      "duoi 1 thang",
      "gan het han",
      "het date",
      "qua date",
      "stock",
      "stock overview",
      "inventory status",
      "near expiry",
      "near-expiry",
      "inventory",
      "expiry",
      "expiring",
      "expired",
      "batch",
      "fifo",
      "transaction",
      "giao dich",
      "xuat nhap",
      "lich su kho",
      "recent transactions",
    ];
    const qcHints = [
      "qc",
      "quality",
      "compliance",
      "kiem tra chat luong",
      "kiểm tra chất lượng",
      "submit_decision",
      "reject",
      "hold",
      "accepted",
    ];
    if (warehouseHints.some((h) => combined.includes(h)))
      return {
        intent: AgentIntent.WAREHOUSE_OPERATOR,
        confidence: ROUTING_CONFIDENCE_THRESHOLD,
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
    return null;
  }

  private inferActionIfMissing(
    input: AgentHandlerInput,
    intent: AgentIntent,
  ): AgentHandlerInput {
    if (input.action && input.action.trim().length > 0) return input;
    const normalized = this.normalizeText(input.query);
    if (intent === AgentIntent.WAREHOUSE_OPERATOR) {
      if (
        normalized.includes("tao lo") ||
        normalized.includes("tạo lô") ||
        normalized.includes("nhap lo") ||
        normalized.includes("nhập lô")
      )
        return { ...input, action: "create_lot" };
      if (normalized.includes("barcode") || normalized.includes("ma vach"))
        return { ...input, action: "generate_barcode" };
      if (
        normalized.includes("gan kho") ||
        normalized.includes("gán kho") ||
        normalized.includes("storage location")
      )
        return { ...input, action: "assign_warehouse" };
    }
    if (
      intent === AgentIntent.QC_COMPLIANCE_CHECKER &&
      (normalized.includes("submit") ||
        normalized.includes("duyet qc") ||
        normalized.includes("duyệt qc"))
    )
      return { ...input, action: "submit_decision" };
    return input;
  }

  private extractJson(rawText: string): string {
    const trimmed = rawText.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) return fenced[1].trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
    return trimmed;
  }
}
