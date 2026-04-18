import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

interface AiDataGrpcService {
  executeAction(req: { action: string; payload: string }): Observable<{
    success: boolean;
    data: string;
    error: string;
  }>;
}

@Injectable()
export class BackendDataService implements OnModuleInit {
  private readonly logger = new Logger(BackendDataService.name);
  private aiDataService: AiDataGrpcService;

  constructor(@Inject('BACKEND_AI_DATA') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.aiDataService = this.client.getService<AiDataGrpcService>('AiDataService');
  }

  private async execute<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const result = await firstValueFrom(
      this.aiDataService.executeAction({ action, payload: JSON.stringify(payload) }),
    );
    if (!result.success) {
      throw new Error(result.error || `AiDataService action '${action}' failed`);
    }
    return JSON.parse(result.data) as T;
  }

  // ─── InventoryLot ─────────────────────────────────────────────────────────

  async getLotsStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    expiringSoon: number;
    expired: number;
  }> {
    return this.execute('getLotsStatistics');
  }

  async getExpiringSoon(days = 30): Promise<unknown[]> {
    return this.execute('getExpiringSoon', { days });
  }

  async getExpiredLots(): Promise<unknown[]> {
    return this.execute('getExpiredLots');
  }

  async createInventoryLot(dto: Record<string, unknown>): Promise<unknown> {
    return this.execute('createInventoryLot', dto);
  }

  async findInventoryLotById(id: string): Promise<unknown> {
    return this.execute('findInventoryLotById', { id });
  }

  async updateInventoryLot(id: string, dto: Record<string, unknown>): Promise<unknown> {
    return this.execute('updateInventoryLot', { id, ...dto });
  }

  // ─── InventoryTransaction ─────────────────────────────────────────────────

  async getTransactions(page = 1, limit = 20): Promise<{ items: unknown[]; total: number }> {
    return this.execute('getTransactions', { page, limit });
  }

  // ─── QC Test ──────────────────────────────────────────────────────────────

  async getSupplierPerformance(filter?: { from?: string; to?: string }): Promise<unknown[]> {
    return this.execute('getSupplierPerformance', filter ?? {});
  }

  async getDashboardKPI(): Promise<{
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    error_rate: number;
  }> {
    return this.execute('getDashboardKPI');
  }

  async submitQCDecision(
    lotId: string,
    dto: { decision: string; verified_by: string; reject_reason?: string },
  ): Promise<unknown> {
    return this.execute('submitQCDecision', { lot_id: lotId, ...dto });
  }
}
