import { Injectable } from '@nestjs/common';
import type { InventoryLotResponseDto } from '../../inventory-lot/inventory-lot.dto';
import { InventoryLotService } from '../../inventory-lot/inventory-lot.service';
import { InventoryTransactionService } from '../../inventory-transaction/inventory-transaction.service';
import type { AgentHandlerInput, AgentHandlerOutput } from '../ai-agents.types';
import { AgentLlmService } from '../services/agent-llm.service';

type LotStatistics = {
  total: number;
  byStatus: Record<string, number>;
  expiringSoon: number;
  expired: number;
};

type TransactionPage = {
  items: unknown[];
  total: number;
};

type TransactionReader = {
  getAll: (
    filters: Record<string, unknown>,
    paging: { page: number; limit: number },
  ) => Promise<TransactionPage>;
};

type InventoryAgentProfile = {
  name: string;
  description: string;
  instructions: string[];
  model: string;
  tools: string[];
};

@Injectable()
export class InventoryAnalystAgent {
  private readonly profile: InventoryAgentProfile = {
    name: 'Inventory Analyst',
    description:
      'Phân tích tồn kho, cảnh báo hạn sử dụng, và tổng hợp dữ liệu giao dịch kho.',
    instructions: [
      'Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, dễ hiểu cho người dùng cuối.',
      'Ưu tiên thông tin cảnh báo hạn sử dụng và các bước hành động tiếp theo.',
      'Nếu có dữ liệu lô sắp hết hạn/hết hạn, nhắc người dùng xem bảng chi tiết.',
    ],
    model: 'gemini-2.5-flash',
    tools: [
      'InventoryLotService.getLotsStatistics',
      'InventoryLotService.getExpiringSoon',
      'InventoryLotService.getExpiredLots',
      'InventoryTransactionService.getAll',
      'AgentLlmService.generateReply',
    ],
  };

  constructor(
    private readonly inventoryLotService: InventoryLotService,
    private readonly inventoryTransactionService: InventoryTransactionService,
    private readonly agentLlmService: AgentLlmService,
  ) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    try {
      if (!this.isInventoryDomainQuery(input.query, input.action)) {
        return {
          status: 'needs_input',
          message:
            'Inventory Analyst only handles inventory analytics and expiry-related queries.',
          assistant_reply:
            'Tôi chỉ hỗ trợ phân tích tồn kho và hạn dùng. Bạn có thể hỏi như: "các lô sắp hết hạn" hoặc "báo cáo tồn kho".',
          agent_profile: this.profile,
          data: {
            query: input.query,
            supported_topics: [
              'thống kê tồn kho',
              'lô sắp hết hạn',
              'lô đã hết hạn',
              'báo cáo giao dịch kho',
            ],
          },
        };
      }

      const normalizedQuery = (input.query || '').toLowerCase();
      const pageInput = Number(input.payload?.page ?? 1);
      const limitInput = Number(input.payload?.limit ?? 20);
      const page = Number.isFinite(pageInput) && pageInput > 0 ? pageInput : 1;
      const limit =
        Number.isFinite(limitInput) && limitInput > 0 ? limitInput : 20;

      const [lotStats, transactions] = await Promise.all([
        this.inventoryLotService.getLotsStatistics() as Promise<LotStatistics>,
        this.getTransactions(page, limit),
      ]);

      const asksExpireInDays =
        normalizedQuery.includes('hết hạn trong') ||
        normalizedQuery.includes('het han trong');

      const asksExpiringPhrase =
        normalizedQuery.includes('sắp hết hạn') ||
        normalizedQuery.includes('sap het han') ||
        normalizedQuery.includes('còn hạn dưới 1 tháng') ||
        normalizedQuery.includes('con han duoi 1 thang') ||
        normalizedQuery.includes('dưới 1 tháng') ||
        normalizedQuery.includes('duoi 1 thang');

      const requestedDaysWindow = this.extractDaysWindow(normalizedQuery);

      const asksExpiringSoon =
        asksExpiringPhrase ||
        asksExpireInDays ||
        normalizedQuery.includes('expiring');

      const asksExpired =
        normalizedQuery.includes('đã hết hạn') ||
        normalizedQuery.includes('da het han') ||
        (normalizedQuery.includes('hết hạn') &&
          !asksExpireInDays &&
          !asksExpiringPhrase) ||
        normalizedQuery.includes('het han') ||
        normalizedQuery.includes('expired');

      const asksSpecificExpiry = asksExpiringSoon || asksExpired;

      let expiringLots: InventoryLotResponseDto[] = [];
      let expiredLots: InventoryLotResponseDto[] = [];

      if (asksExpiringSoon) {
        expiringLots =
          await this.inventoryLotService.getExpiringSoon(requestedDaysWindow);
      }

      if (asksExpired) {
        expiredLots = await this.inventoryLotService.getExpiredLots();
      }

      const insights: string[] = [];
      if (!asksSpecificExpiry && lotStats.expired > 0) {
        insights.push(
          `${lotStats.expired} lô hàng đã hết hạn và cần được xử lý ngay lập tức.`,
        );
      }
      if (!asksSpecificExpiry && lotStats.expiringSoon > 0) {
        insights.push(
          `${lotStats.expiringSoon} lô hàng sắp hết hạn và cần lập kế hoạch xử lý.`,
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
        transactions: transactions.items,
        pagination: {
          page,
          limit,
          total: transactions.total,
          totalPages: Math.ceil(transactions.total / limit),
        },
        insights,
        query_window_days: requestedDaysWindow,
      };

      const llmContext = {
        lots: lotStats,
        expiringLots: expiringLots.map((lot) => ({
          lot_id: lot.lot_id,
          material_id: lot.material_id,
          expiration_date: lot.expiration_date,
          quantity: lot.quantity,
          unit_of_measure: lot.unit_of_measure,
          status: lot.status,
        })),
        expiredLots: expiredLots.map((lot) => ({
          lot_id: lot.lot_id,
          material_id: lot.material_id,
          expiration_date: lot.expiration_date,
          quantity: lot.quantity,
          unit_of_measure: lot.unit_of_measure,
          status: lot.status,
        })),
        transactionCount: transactions.total,
        insights,
        query_window_days: requestedDaysWindow,
      };

      const assistantReply =
        (await this.agentLlmService.generateReply(
          this.profile,
          input.query,
          llmContext,
        )) ||
        this.buildFallbackReply(
          expiringLots.length,
          expiredLots.length,
          asksExpiringSoon,
          asksExpired,
          requestedDaysWindow,
          insights,
        );

      return {
        status: 'ok',
        message: 'Inventory analysis generated successfully.',
        assistant_reply: assistantReply,
        agent_profile: this.profile,
        data: {
          query: input.query,
          ...contextData,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[InventoryAnalystAgent] Error:`, errorMsg);

      return {
        status: 'error',
        message: `Lỗi phân tích tồn kho: ${errorMsg}`,
        assistant_reply: `Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu: ${errorMsg}. Vui lòng thử lại.`,
        agent_profile: this.profile,
        data: {},
      };
    }
  }

  private buildFallbackReply(
    expiringLots: number,
    expiredLots: number,
    asksExpiringSoon: boolean,
    asksExpired: boolean,
    requestedDaysWindow: number,
    insights: string[],
  ): string {
    if (insights.length > 0) {
      return insights.join(' ');
    }

    if (asksExpiringSoon && !asksExpired) {
      return `Hiện chưa ghi nhận lô sắp hết hạn trong ${requestedDaysWindow} ngày theo điều kiện truy vấn.`;
    }

    if (asksExpired && !asksExpiringSoon) {
      return 'Hiện chưa ghi nhận lô đã hết hạn theo điều kiện truy vấn.';
    }

    const warning =
      expiringLots > 0 || expiredLots > 0
        ? `Hiện có ${expiringLots} lô sắp hết hạn và ${expiredLots} lô đã hết hạn. Vui lòng xem bảng danh sách để xử lý.`
        : 'Hiện chưa ghi nhận lô sắp hết hạn hoặc đã hết hạn theo phạm vi truy vấn.';

    return warning;
  }

  private getTransactions(
    page: number,
    limit: number,
  ): Promise<TransactionPage> {
    const reader = this
      .inventoryTransactionService as unknown as TransactionReader;
    return reader.getAll({}, { page, limit });
  }

  private isInventoryDomainQuery(query: string, action?: string): boolean {
    const normalizedAction = (action || '').toLowerCase().trim();
    if (
      normalizedAction.includes('inventory') ||
      normalizedAction.includes('report')
    ) {
      return true;
    }

    const normalized = (query || '')
      .toLowerCase()
      .replace(/[!?.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return false;
    }

    const inventoryKeywords = [
      'het han',
      'hết hạn',
      'sap het han',
      'sắp hết hạn',
      'con han',
      'còn hạn',
      'bao cao',
      'báo cáo',
      'ton kho',
      'tồn kho',
      'inventory',
      'report',
      'lot',
      'lô',
      'transaction',
      'giao dịch',
    ];

    return inventoryKeywords.some((keyword) => normalized.includes(keyword));
  }

  private extractDaysWindow(normalizedQuery: string): number {
    const matched = normalizedQuery.match(/(\d+)\s*ngày/);
    if (!matched?.[1]) {
      return 30;
    }

    const parsed = Number(matched[1]);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 30;
    }

    return Math.min(parsed, 365);
  }
}
