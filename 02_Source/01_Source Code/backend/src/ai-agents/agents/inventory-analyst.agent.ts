import { Injectable } from '@nestjs/common';
import type { InventoryLotResponseDto } from '../../inventory-lot/inventory-lot.dto';
import { InventoryLotService } from '../../inventory-lot/inventory-lot.service';
import { InventoryTransactionService } from '../../inventory-transaction/inventory-transaction.service';
import { AgentHandlerInput, AgentHandlerOutput } from '../ai-agents.types';

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

@Injectable()
export class InventoryAnalystAgent {
  constructor(
    private readonly inventoryLotService: InventoryLotService,
    private readonly inventoryTransactionService: InventoryTransactionService,
  ) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
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

    const asksExpiringSoon =
      normalizedQuery.includes('sắp hết hạn') ||
      normalizedQuery.includes('sap het han') ||
      normalizedQuery.includes('còn hạn dưới 1 tháng') ||
      normalizedQuery.includes('con han duoi 1 thang') ||
      normalizedQuery.includes('dưới 1 tháng') ||
      normalizedQuery.includes('duoi 1 thang') ||
      normalizedQuery.includes('expiring');

    const asksExpired =
      normalizedQuery.includes('hết hạn') ||
      normalizedQuery.includes('het han') ||
      normalizedQuery.includes('expired');

    let expiringLots: InventoryLotResponseDto[] = [];
    let expiredLots: InventoryLotResponseDto[] = [];

    if (asksExpiringSoon) {
      expiringLots = await this.inventoryLotService.getExpiringSoon(30);
    }

    if (asksExpired) {
      expiredLots = await this.inventoryLotService.getExpiredLots();
    }

    const insights: string[] = [];
    if (lotStats.expired > 0) {
      insights.push(
        `${lotStats.expired} lots are already expired and should be prioritized for disposition.`,
      );
    }
    if (lotStats.expiringSoon > 0) {
      insights.push(
        `${lotStats.expiringSoon} lots are expiring soon and require proactive planning.`,
      );
    }
    if (asksExpiringSoon) {
      insights.push(
        `Found ${expiringLots.length} lots with remaining shelf life under 30 days.`,
      );
    }
    if (asksExpired) {
      insights.push(`Found ${expiredLots.length} already expired lots.`);
    }

    return {
      status: 'ok',
      message: 'Inventory analysis generated successfully.',
      data: {
        query: input.query,
        lots: lotStats,
        transactions: transactions.items,
        pagination: {
          page,
          limit,
          total: transactions.total,
          totalPages: Math.ceil(transactions.total / limit),
        },
        expiringLots,
        expiredLots,
        insights,
      },
    };
  }

  private getTransactions(
    page: number,
    limit: number,
  ): Promise<TransactionPage> {
    const reader = this
      .inventoryTransactionService as unknown as TransactionReader;
    return reader.getAll({}, { page, limit });
  }
}
