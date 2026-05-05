// === SUPERVISOR AGENT ===
// Agent giám sát điều hướng yêu cầu tới agent chuyên biệt
// Phân loại intent (AI + heuristic) và route tới InventoryAnalyst/WarehouseOperator/QcComplianceChecker

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AgentHandlerOutput, AgentHandlerInput, AgentIntent, AgentRouteResult } from "../ai-agents.types";
import { InventoryAnalystAgent } from "./inventory-analyst.agent";
import { WarehouseOperatorAgent } from "./warehouse-operator.agent";
import { QcComplianceCheckerAgent } from "./qc-compliance-checker.agent";

interface RoutingDecision { intent: AgentIntent; confidence: number; reason: string; }

const ROUTING_CONFIDENCE_THRESHOLD = 0.7;
const GEMINI_ROUTER_TIMEOUT_MS = 7000;
const FALLBACK_MESSAGE = "Xin lỗi, yêu cầu này hiện chưa được hỗ trợ. Vui lòng liên hệ hotro@gmail.com để được hỗ trợ thêm.";

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
    // [RÚT GỌN: Normalize query, check greeting, classify intent via Gemini + heuristic fallback,
    //  dispatch to appropriate agent (warehouse/QC/inventory) based on intent, build route result]
    throw new Error("Skeleton: not implemented");
  }

  private async classifyIntent(query: string, action?: string): Promise<RoutingDecision> {
    // [RÚT GỌN: Check USE_GEMINI_ROUTER config, call tryGeminiClassification or return UNKNOWN]
    throw new Error("Skeleton: not implemented");
  }

  private async tryGeminiClassification(query: string, action: string | undefined, apiKey: string): Promise<RoutingDecision | null> {
    // [RÚT GỌN: POST to Gemini API with intent classification prompt, parse JSON response, validate intent]
    throw new Error("Skeleton: not implemented");
  }

  private buildFallbackResult(reason: string, confidence: number): AgentRouteResult {
    // [RÚT GỌN: Return AgentRouteResult with UNKNOWN intent and fallback message]
    throw new Error("Skeleton: not implemented");
  }

  private buildRouteResult(intent: AgentIntent, confidence: number, reason: string, result: AgentHandlerOutput): AgentRouteResult {
    // [RÚT GỌN: Build AgentRouteResult with timestamp]
    throw new Error("Skeleton: not implemented");
  }

  private normalizeText(text: string): string {
    // [RÚT GỌN: NFD normalize, remove diacritics, đ->d, lowercase, remove punctuation, collapse whitespace]
    throw new Error("Skeleton: not implemented");
  }

  private isGreeting(normalizedText: string): boolean {
    // [RÚT GỌN: Check if text matches greeting set (xin chao, chao, hello, hi, hey, alo)]
    throw new Error("Skeleton: not implemented");
  }

  private deriveIntentFromDomainHints(normalizedQuery: string, action?: string): RoutingDecision | null {
    // [RÚT GỌN: Match warehouse/inventory/QC keyword hints, return RoutingDecision with confidence 0.7]
    throw new Error("Skeleton: not implemented");
  }

  private inferActionIfMissing(input: AgentHandlerInput, intent: AgentIntent): AgentHandlerInput {
    // [RÚT GỌN: If action is empty, infer from query keywords (create_lot, generate_barcode, assign_warehouse, submit_decision)]
    throw new Error("Skeleton: not implemented");
  }

  private extractJson(rawText: string): string {
    // [RÚT GỌN: Extract JSON from raw text (handles raw JSON, markdown code blocks, or find { } boundaries)]
    throw new Error("Skeleton: not implemented");
  }
}
