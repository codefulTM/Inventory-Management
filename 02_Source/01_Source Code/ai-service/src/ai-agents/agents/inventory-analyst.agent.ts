// === INVENTORY ANALYST AGENT ===
// AI Agent phân tích inventory: thống kê tồn kho, cảnh báo lô sắp hết hạn/đã hết hạn, truy vấn RAG
// Sử dụng LangGraph workflow với các nodes: data_collection, analysis, recommendation
// Tích hợp với inventory-management-service qua gRPC

import { Injectable } from "@nestjs/common";
import { BackendDataService } from "../../backend-client/backend-data.service";
import type { RagSearchResponse } from "../../backend-client/backend-data.service";
import { AgentLlmService } from "../services/agent-llm.service";
import { QueryEmbeddingService } from "../services/query-embedding.service";
import type { AgentHandlerInput, AgentHandlerOutput } from "../ai-agents.types";

type UserRole = "manager" | "operator" | "quality-control" | "it_admin" | "unknown";
type NearestExpiryLot = { sourceId: string; expirationDate: string; daysRemaining: number };
type TransactionDigest = { id: string; type: string; materialId: string; quantity: string; happenedAt: string };

@Injectable()
export class InventoryAnalystAgent {
  private readonly profile = {
    name: "Inventory Analyst",
    description: "Phân tích tồn kho, cảnh báo hạn sử dụng, và tổng hợp dữ liệu giao dịch kho.",
    instructions: [
      "Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, dễ hiểu cho người dùng cuối.",
      "Ưu tiên thông tin cảnh báo hạn sử dụng và các bước hành động tiếp theo.",
      "Nếu có dữ liệu lô sắp hết hạn/hết hạn, nhắc người dùng xem bảng chi tiết.",
    ],
    model: "gemini-2.5-flash",
    tools: [
      "BackendDataService.getLotsStatistics", "BackendDataService.getExpiringSoon",
      "BackendDataService.getExpiredLots", "BackendDataService.getTransactions",
      "BackendDataService.semanticSearch", "BackendDataService.hybridSearch",
      "QueryEmbeddingService.embedQuery", "AgentLlmService.generateReply",
    ],
  };

  constructor(
    private readonly backendDataService: BackendDataService,
    private readonly agentLlmService: AgentLlmService,
    private readonly queryEmbeddingService: QueryEmbeddingService,
  ) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    // [RÚT GỌN: Validate inventory domain query, fetch lot stats + transactions in parallel,
    //  detect expiring/expired intent, perform RAG hybrid/semantic search with fallback to docs_knowledge,
    //  extract highlights/citations/nearest expiry lot, build context data, call LLM for reply,
    //  sanitize reply and fallback to template if needed]
    throw new Error("Skeleton: not implemented");
  }

  private buildFallbackReply(
    lotSummary: { total: number; expiringSoon: number; expired: number },
    expiringLots: number, expiredLots: number, asksExpiringSoon: boolean,
    asksExpired: boolean, asksRecentTransactions: boolean, days: number,
    insights: string[], userRole: UserRole, nearestExpiryLot?: NearestExpiryLot,
    transactionDigests?: TransactionDigest[], transactionLimit?: number,
  ): string {
    // [RÚT GỌN: Build role-based guidance, handle transaction/overview/expiring/expired reply templates]
    throw new Error("Skeleton: not implemented");
  }

  private normalizeUserRole(inputRole: unknown): UserRole {
    // [RÚT GỌN: Map display names to role slugs (manager, operator, quality-control, it_admin)]
    throw new Error("Skeleton: not implemented");
  }

  private toSafeNumber(value: unknown): number {
    // [RÚT GỌN: Parse to number, return 0 if not finite or negative]
    throw new Error("Skeleton: not implemented");
  }

  private buildRoleGuidance(userRole: UserRole, expiringLots: number, expiredLots: number, days: number): string {
    // [RÚT GỌN: Return role-specific advice (manager/operator/QC/unknown) based on risk status]
    throw new Error("Skeleton: not implemented");
  }

  private sanitizeAssistantReply(reply?: string): string {
    // [RÚT GỌN: Split lines, filter out lines containing technical terms (rag, embedding, citation, semantic, hybrid)]
    throw new Error("Skeleton: not implemented");
  }

  private isReplyAlignedToQuery(reply: string, asksExpiringSoon: boolean, asksExpired: boolean, asksRecentTransactions: boolean): boolean {
    // [RÚT GỌN: Check if reply contains signals matching the query intent (expiring/expired/transaction/overview)]
    throw new Error("Skeleton: not implemented");
  }

  private isInventoryDomainQuery(query: string, action?: string): boolean {
    // [RÚT GỌN: Check if query contains inventory domain keywords (het han, ton kho, stock, fifo, transaction, etc.)]
    throw new Error("Skeleton: not implemented");
  }

  private detectRecentTransactionsIntent(normalizedQuery: string): boolean {
    // [RÚT GỌN: Check for transaction-related keywords]
    throw new Error("Skeleton: not implemented");
  }

  private extractTransactionLimit(normalizedQuery: string): number {
    // [RÚT GỌN: Extract number from query, default 10, max 100]
    throw new Error("Skeleton: not implemented");
  }

  private extractDaysWindow(normalizedQuery: string): number {
    // [RÚT GỌN: Extract days/weeks/months from query, convert to days, default 30, max 365]
    throw new Error("Skeleton: not implemented");
  }

  private detectExpiringIntent(normalizedQuery: string): boolean {
    // [RÚT GỌN: Check for expiring-soon keywords (sap het han, con han, near expiry, etc.)]
    throw new Error("Skeleton: not implemented");
  }

  private detectExpiredIntent(normalizedQuery: string, asksExpiringSoon: boolean): boolean {
    // [RÚT GỌN: Check for expired keywords (da het han, qua han, expired) or 'het han' without expiring context]
    throw new Error("Skeleton: not implemented");
  }

  private normalizeForMatching(text: string): string {
    // [RÚT GỌN: NFD normalize, remove diacritics, đ->d, lowercase, remove punctuation, collapse whitespace]
    throw new Error("Skeleton: not implemented");
  }

  private extractNearestExpiryLotFromCitations(citations: Array<{ source_id: string; preview?: string }>): NearestExpiryLot | undefined {
    // [RÚT GỌN: Parse Expiration Date from citation previews, return nearest future date lot]
    throw new Error("Skeleton: not implemented");
  }

  private formatDate(dateText: string): string {
    // [RÚT GỌN: Parse date and format to vi-VN locale]
    throw new Error("Skeleton: not implemented");
  }

  private extractTransactionDigests(transactions: unknown, limit: number): TransactionDigest[] {
    // [RÚT GỌN: Map transaction records to digest format (id, type, materialId, quantity, happenedAt)]
    throw new Error("Skeleton: not implemented");
  }

  private toStringValue(value: unknown): string {
    // [RÚT GỌN: Convert string/number to string, else empty]
    throw new Error("Skeleton: not implemented");
  }

  private formatDateTime(dateText: string): string {
    // [RÚT GỌN: Parse date and format to vi-VN locale string]
    throw new Error("Skeleton: not implemented");
  }

  private containsAny(text: string, keywords: string[]): boolean {
    // [RÚT GỌN: Check if text contains any of the keywords]
    throw new Error("Skeleton: not implemented");
  }
}
