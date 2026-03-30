import { Injectable } from '@nestjs/common';
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
    const pageInput = Number(input.payload?.page ?? 1);
    const limitInput = Number(input.payload?.limit ?? 20);
    const page = Number.isFinite(pageInput) && pageInput > 0 ? pageInput : 1;
    const limit =
      Number.isFinite(limitInput) && limitInput > 0 ? limitInput : 20;

    const transactionReader = this
      .inventoryTransactionService as unknown as TransactionReader;

    const [lotStats, transactions] = await Promise.all([
      this.inventoryLotService.getLotsStatistics() as Promise<LotStatistics>,
      transactionReader.getAll(
        {},
        {
          page,
          limit,
        },
      ),
    ]);

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
        insights,
      },
    };
  }
}
