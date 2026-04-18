import { Injectable } from '@nestjs/common';
import { BackendDataService } from '../../backend-client/backend-data.service';
import { AgentLlmService } from '../services/agent-llm.service';
import type { AgentHandlerInput, AgentHandlerOutput } from '../ai-agents.types';

@Injectable()
export class InventoryAnalystAgent {
  private readonly profile = {
    name: 'Inventory Analyst',
    description: 'Phân tích tồn kho, cảnh báo hạn sử dụng, và tổng hợp dữ liệu giao dịch kho.',
    instructions: [
      'Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, dễ hiểu cho người dùng cuối.',
      'Ưu tiên thông tin cảnh báo hạn sử dụng và các bước hành động tiếp theo.',
      'Nếu có dữ liệu lô sắp hết hạn/hết hạn, nhắc người dùng xem bảng chi tiết.',
    ],
    model: 'gemini-2.5-flash',
    tools: [
      'BackendDataService.getLotsStatistics',
      'BackendDataService.getExpiringSoon',
      'BackendDataService.getExpiredLots',
      'BackendDataService.getTransactions',
      'AgentLlmService.generateReply',
    ],
  };

  constructor(
    private readonly backendDataService: BackendDataService,
    private readonly agentLlmService: AgentLlmService,
  ) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    try {
      if (!this.isInventoryDomainQuery(input.query, input.action)) {
        return {
          status: 'needs_input',
          message: 'Inventory Analyst only handles inventory analytics and expiry-related queries.',
          assistant_reply: 'Tôi chỉ hỗ trợ phân tích tồn kho và hạn dùng. Bạn có thể hỏi như: "các lô sắp hết hạn" hoặc "báo cáo tồn kho".',
          agent_profile: this.profile,
          data: { query: input.query, supported_topics: ['thống kê tồn kho', 'lô sắp hết hạn', 'lô đã hết hạn', 'báo cáo giao dịch kho'] },
        };
      }

      const normalizedQuery = (input.query || '').toLowerCase();
      const page = Number(input.payload?.page ?? 1);
      const limit = Number(input.payload?.limit ?? 20);

      const [lotStats, transactions] = await Promise.all([
        this.backendDataService.getLotsStatistics(),
        this.backendDataService.getTransactions(page, limit),
      ]);

      const requestedDaysWindow = this.extractDaysWindow(normalizedQuery);
      const asksExpiringSoon =
        normalizedQuery.includes('sắp hết hạn') ||
        normalizedQuery.includes('sap het han') ||
        normalizedQuery.includes('hết hạn trong') ||
        normalizedQuery.includes('het han trong') ||
        normalizedQuery.includes('expiring');

      const asksExpired =
        normalizedQuery.includes('đã hết hạn') ||
        normalizedQuery.includes('da het han') ||
        (normalizedQuery.includes('hết hạn') && !asksExpiringSoon) ||
        normalizedQuery.includes('het han') ||
        normalizedQuery.includes('expired');

      let expiringLots: unknown[] = [];
      let expiredLots: unknown[] = [];

      if (asksExpiringSoon) expiringLots = await this.backendDataService.getExpiringSoon(requestedDaysWindow);
      if (asksExpired) expiredLots = await this.backendDataService.getExpiredLots();

      const insights: string[] = [];
      if (!asksExpiringSoon && !asksExpired && (lotStats as any).expired > 0) {
        insights.push(`${(lotStats as any).expired} lô hàng đã hết hạn và cần được xử lý ngay lập tức.`);
      }
      if (!asksExpiringSoon && !asksExpired && (lotStats as any).expiringSoon > 0) {
        insights.push(`${(lotStats as any).expiringSoon} lô hàng sắp hết hạn và cần lập kế hoạch xử lý.`);
      }
      if (asksExpiringSoon && expiringLots.length > 0) {
        insights.push(`Tìm thấy ${expiringLots.length} lô hàng còn hạn trong ${requestedDaysWindow} ngày.`);
      }
      if (asksExpired && expiredLots.length > 0) {
        insights.push(`Tìm thấy ${expiredLots.length} lô hàng đã hết hạn.`);
      }

      const contextData = { lots: lotStats, expiringLots, expiredLots, transactions: (transactions as any).items, pagination: { page, limit, total: (transactions as any).total, totalPages: Math.ceil((transactions as any).total / limit) }, insights, query_window_days: requestedDaysWindow };

      const assistantReply =
        (await this.agentLlmService.generateReply(this.profile, input.query, contextData as any)) ||
        this.buildFallbackReply(expiringLots.length, expiredLots.length, asksExpiringSoon, asksExpired, requestedDaysWindow, insights);

      return {
        status: 'ok',
        message: 'Inventory analysis generated successfully.',
        assistant_reply: assistantReply,
        agent_profile: this.profile,
        data: { query: input.query, ...contextData },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        message: `Lỗi phân tích tồn kho: ${errorMsg}`,
        assistant_reply: `Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu: ${errorMsg}. Vui lòng thử lại.`,
        agent_profile: this.profile,
        data: {},
      };
    }
  }

  private buildFallbackReply(expiringLots: number, expiredLots: number, asksExpiringSoon: boolean, asksExpired: boolean, days: number, insights: string[]): string {
    if (insights.length > 0) return insights.join(' ');
    if (asksExpiringSoon && !asksExpired) return `Hiện chưa ghi nhận lô sắp hết hạn trong ${days} ngày theo điều kiện truy vấn.`;
    if (asksExpired && !asksExpiringSoon) return 'Hiện chưa ghi nhận lô đã hết hạn theo điều kiện truy vấn.';
    return expiringLots > 0 || expiredLots > 0
      ? `Hiện có ${expiringLots} lô sắp hết hạn và ${expiredLots} lô đã hết hạn. Vui lòng xem bảng danh sách để xử lý.`
      : 'Hiện chưa ghi nhận lô sắp hết hạn hoặc đã hết hạn theo phạm vi truy vấn.';
  }

  private isInventoryDomainQuery(query: string, action?: string): boolean {
    const normalizedAction = (action || '').toLowerCase().trim();
    if (normalizedAction.includes('inventory') || normalizedAction.includes('report')) return true;
    const normalized = (query || '').toLowerCase().replace(/[!?.,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) return false;
    const keywords = ['het han', 'hết hạn', 'sap het han', 'sắp hết hạn', 'con han', 'còn hạn', 'bao cao', 'báo cáo', 'ton kho', 'tồn kho', 'inventory', 'report', 'lot', 'lô', 'transaction', 'giao dịch'];
    return keywords.some((k) => normalized.includes(k));
  }

  private extractDaysWindow(normalizedQuery: string): number {
    const matched = normalizedQuery.match(/(\d+)\s*ngày/);
    if (!matched?.[1]) return 30;
    const parsed = Number(matched[1]);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 365) : 30;
  }
}
