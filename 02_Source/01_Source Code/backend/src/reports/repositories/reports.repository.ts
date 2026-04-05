import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportsRepository {
  async getInventoryStatus(): Promise<
    Array<{
      material_id: string;
      lot_id: string;
      quantity: number;
      status: string;
      expiration_date?: Date;
    }>
  > {
    return [];
  }

  async getMaterialUsage(
    _from?: Date,
    _to?: Date,
  ): Promise<Array<{ material_id: string; transaction_count: number; total_quantity: number }>> {
    return [];
  }

  async getQcPerformance(): Promise<
    Array<{ supplier_name: string; approved: number; rejected: number; quality_rate: number }>
  > {
    return [];
  }

  async getAuditTrail(): Promise<
    Array<{
      action: string;
      entity: string;
      performed_by: string;
      performed_at: Date;
      details?: Record<string, unknown>;
    }>
  > {
    return [];
  }
}
