// === QC COMPLIANCE CHECKER AGENT ===
// Agent kiểm tra chất lượng và tuân thủ: submit quyết định QC (Accepted/Rejected/Hold), xem dashboard KPI, phân tích hiệu suất NCC

import { Injectable } from "@nestjs/common";
import { BackendDataService } from "../../backend-client/backend-data.service";
import { AgentLlmService } from "../services/agent-llm.service";
import type { AgentHandlerInput, AgentHandlerOutput, AgentProfile } from "../ai-agents.types";

@Injectable()
export class QcComplianceCheckerAgent {
  private readonly profile: AgentProfile = {
    name: "QC Compliance Checker",
    description: "Đánh giá tuân thủ QC, kết quả kiểm tra chất lượng, và cảnh báo liên quan.",
    instructions: [
      "Chỉ trả lời các yêu cầu thuộc lĩnh vực QC/compliance.",
      "Nếu thiếu dữ liệu bắt buộc khi submit quyết định QC thì yêu cầu bổ sung.",
      "Trả lời tiếng Việt tự nhiên, rõ ràng và không suy diễn ngoài dữ liệu.",
    ],
    model: "gemini-2.5-flash",
    tools: ["BackendDataService.submitQCDecision", "BackendDataService.getDashboardKPI", "BackendDataService.getSupplierPerformance"],
  };

  constructor(
    private readonly backendDataService: BackendDataService,
    private readonly agentLlmService: AgentLlmService,
  ) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    // [RÚT GỌN: Check QC domain query, dispatch submit_decision (validate lot_id/decision/verified_by) or show dashboard KPI]
    throw new Error("Skeleton: not implemented");
  }

  private isQcDomainQuery(query: string, action?: string): boolean {
    // [RÚT GỌN: Check for QC keywords (qc, quality, compliance, kiểm tra chất lượng, submit_decision, reject, hold)]
    throw new Error("Skeleton: not implemented");
  }

  private buildFallbackReply(data: unknown): string {
    // [RÚT GỌN: Build natural language reply from QC data using LLM or template]
    throw new Error("Skeleton: not implemented");
  }

  private summarizeKPIs(kpi: unknown): string {
    // [RÚT GỌN: Format KPI data into readable summary (total tests, pass rate, rejection rate)]
    throw new Error("Skeleton: not implemented");
  }

  private summarizeSupplierPerformance(performance: unknown): string {
    // [RÚT GỌN: Format supplier performance data (supplier name, defect rate, total deliveries)]
    throw new Error("Skeleton: not implemented");
  }

  private withAssistantReply(query: string, result: AgentHandlerOutput): AgentHandlerOutput {
    // [RÚT GỌN: Call LLM to generate natural reply from result data, attach to assistant_reply field]
    throw new Error("Skeleton: not implemented");
  }
}
