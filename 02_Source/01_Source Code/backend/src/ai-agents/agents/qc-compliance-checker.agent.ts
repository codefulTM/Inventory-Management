import { Injectable } from '@nestjs/common';
import { QCTestService } from '../../qc-test/qc-test.service';
import { AgentHandlerInput, AgentHandlerOutput } from '../ai-agents.types';

@Injectable()
export class QcComplianceCheckerAgent {
  constructor(private readonly qcTestService: QCTestService) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    const action = (input.action || '').toLowerCase();

    if (action === 'submit_decision') {
      const lotId = this.toStringValue(input.payload?.lot_id);
      const decision = this.toStringValue(input.payload?.decision) as
        | 'Accepted'
        | 'Rejected'
        | 'Hold';
      const verifiedBy = this.toStringValue(input.payload?.verified_by);
      const rejectReason = this.toStringValue(input.payload?.reject_reason);

      if (!lotId || !decision || !verifiedBy) {
        return {
          status: 'needs_input',
          message: 'submit_decision requires lot_id, decision and verified_by.',
          data: {
            expectedFields: [
              'lot_id',
              'decision',
              'verified_by',
              'reject_reason?',
            ],
          },
        };
      }

      const result = await this.qcTestService.submitDecision(lotId, {
        decision,
        verified_by: verifiedBy,
        reject_reason: rejectReason || undefined,
      });

      return {
        status: 'ok',
        message: 'QC decision submitted successfully.',
        data: result as unknown as Record<string, unknown>,
      };
    }

    const [dashboard, supplierPerformance] = await Promise.all([
      this.qcTestService.getDashboardKPI(),
      this.qcTestService.getSupplierPerformance(),
    ]);

    const alerts: string[] = [];
    if (dashboard.error_rate >= 10) {
      alerts.push(
        'QC error rate is high (>= 10%). Investigate incoming lots and suppliers.',
      );
    }
    if (dashboard.pending_count > 0) {
      alerts.push(
        `${dashboard.pending_count} lots are still pending QC decisions.`,
      );
    }

    return {
      status: 'ok',
      message: 'QC compliance snapshot generated successfully.',
      data: {
        query: input.query,
        dashboard,
        supplier_performance: supplierPerformance,
        alerts,
      },
    };
  }

  private toStringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}
