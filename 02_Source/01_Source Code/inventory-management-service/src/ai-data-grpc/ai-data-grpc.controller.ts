import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { InventoryLotService } from '../inventory-lot/inventory-lot.service';
import { InventoryTransactionService } from '../inventory-transaction/inventory-transaction.service';
import { QCTestService } from '../qc-test/qc-test.service';
import { CreateInventoryLotDto, UpdateInventoryLotDto } from '../inventory-lot/inventory-lot.dto';

interface AiDataRequest {
  action: string;
  payload: string; // JSON-encoded
}

interface AiDataResponse {
  success: boolean;
  data: string;  // JSON-encoded
  error: string;
}

@Controller()
export class AiDataGrpcController {
  private readonly logger = new Logger(AiDataGrpcController.name);

  constructor(
    private readonly inventoryLotService: InventoryLotService,
    private readonly inventoryTransactionService: InventoryTransactionService,
    private readonly qcTestService: QCTestService,
  ) {}

  @GrpcMethod('AiDataService', 'ExecuteAction')
  async executeAction(req: AiDataRequest): Promise<AiDataResponse> {
    try {
      const payload = req.payload ? (JSON.parse(req.payload) as Record<string, unknown>) : {};
      const result = await this.dispatch(req.action, payload);
      return { success: true, data: JSON.stringify(result), error: '' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AiDataService.ExecuteAction[${req.action}] error: ${msg}`);
      return { success: false, data: '', error: msg };
    }
  }

  private async dispatch(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    switch (action) {
      case 'getLotsStatistics':
        return this.inventoryLotService.getLotsStatistics();

      case 'getExpiringSoon': {
        const days = typeof payload.days === 'number' ? payload.days : 30;
        return this.inventoryLotService.getExpiringSoon(days);
      }

      case 'getExpiredLots':
        return this.inventoryLotService.getExpiredLots();

      case 'getTransactions': {
        const page = typeof payload.page === 'number' ? payload.page : 1;
        const limit = typeof payload.limit === 'number' ? payload.limit : 20;
        // Cast to unknown first to avoid strict-type issues on the private/union method
        const svc = this.inventoryTransactionService as unknown as {
          getAll: (
            filters: Record<string, unknown>,
            paging: { page: number; limit: number },
          ) => Promise<{ items: unknown[]; total: number }>;
        };
        return svc.getAll({}, { page, limit });
      }

      case 'getSupplierPerformance': {
        const filter: { from?: string; to?: string } = {};
        if (typeof payload.from === 'string') filter.from = payload.from;
        if (typeof payload.to === 'string') filter.to = payload.to;
        return this.qcTestService.getSupplierPerformance(filter);
      }

      case 'getDashboardKPI':
        return this.qcTestService.getDashboardKPI();

      case 'submitQCDecision': {
        const lotId = String(payload.lot_id ?? '');
        const decision = String(payload.decision ?? '') as 'Accepted' | 'Rejected' | 'Hold';
        const verified_by = String(payload.verified_by ?? '');
        const reject_reason = typeof payload.reject_reason === 'string' ? payload.reject_reason : undefined;
        return this.qcTestService.submitDecision(lotId, { decision, verified_by, reject_reason });
      }

      case 'createInventoryLot': {
        const dto = Object.assign(new CreateInventoryLotDto(), payload);
        return this.inventoryLotService.create(dto);
      }

      case 'findInventoryLotById': {
        const id = String(payload.id ?? '');
        return this.inventoryLotService.findById(id);
      }

      case 'updateInventoryLot': {
        const { id, ...rest } = payload as { id: string } & Record<string, unknown>;
        const dto = Object.assign(new UpdateInventoryLotDto(), rest);
        return this.inventoryLotService.update(String(id ?? ''), dto);
      }

      default:
        throw new Error(`Unknown AI data action: ${action}`);
    }
  }
}
