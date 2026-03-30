import { Injectable } from '@nestjs/common';
import { InventoryLotService } from '../../inventory-lot/inventory-lot.service';
import { InventoryTransactionService } from '../../inventory-transaction/inventory-transaction.service';
import { AgentHandlerInput, AgentHandlerOutput } from '../ai-agents.types';

@Injectable()
export class InventoryAnalystAgent {
  constructor(
    private readonly inventoryLotService: InventoryLotService,
    private readonly inventoryTransactionService: InventoryTransactionService,
  ) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    const page = Number(input.payload?.page ?? 1);
    const limit = Number(input.payload?.limit ?? 20);

    const [lotStats, transactions] = await Promise.all([
      this.inventoryLotService.getLotsStatistics(),
      this.inventoryTransactionService.findAll({}, page, limit),
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
        transactions: transactions.data,
        pagination: transactions.pagination,
        insights,
      },
    };
  }
}
