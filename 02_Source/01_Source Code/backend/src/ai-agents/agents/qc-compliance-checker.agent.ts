import { Injectable } from '@nestjs/common';
import { QCTestService } from '../../qc-test/qc-test.service';
import { AgentLlmService } from '../services/agent-llm.service';
import type {
  AgentHandlerInput,
  AgentHandlerOutput,
  AgentProfile,
} from '../ai-agents.types';

@Injectable()
export class QcComplianceCheckerAgent {
  private readonly profile: AgentProfile = {
    name: 'QC Compliance Checker',
    description: 'Đánh giá tuân thủ QC, kết quả kiểm tra chất lượng, và cảnh báo liên quan.',
    instructions: [
      'Chỉ trả lời các yêu cầu thuộc lĩnh vực QC/compliance.',
      'Nếu thiếu dữ liệu bắt buộc khi submit quyết định QC thì yêu cầu bổ sung.',
      'Trả lời tiếng Việt tự nhiên, rõ ràng và không suy diễn ngoài dữ liệu.',
    ],
    model: 'gemini-2.5-flash',
    tools: [
      'QCTestService.submitDecision',
      'QCTestService.getDashboardKPI',
      'QCTestService.getSupplierPerformance',
    ],
  };

  constructor(
    private readonly qcTestService: QCTestService,
    private readonly agentLlmService: AgentLlmService,
  ) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    try {
      const action = (input.action || '').toLowerCase();

      if (!this.isQcDomainQuery(input.query, action)) {
        return {
          status: 'needs_input',
          message:
            'QC Compliance Checker only handles QC/compliance queries and submit_decision action.',
          data: {
            supportedActions: ['submit_decision'],
            supportedTopics: ['kết quả QC', 'tuân thủ chất lượng', 'tỷ lệ lỗi QC'],
          },
        };
      }

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
          assistant_reply:
            (await this.agentLlmService.generateReply(
              this.profile,
              input.query,
              result as unknown as Record<string, unknown>,
            )) || 'Đã ghi nhận quyết định QC thành công.',
          agent_profile: this.profile,
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
        assistant_reply:
          (await this.agentLlmService.generateReply(this.profile, input.query, {
            query: input.query,
            dashboard,
            supplier_performance: supplierPerformance,
            alerts,
          })) ||
          'Tôi đã tổng hợp tình trạng QC hiện tại. Bạn có thể xem chi tiết trong dữ liệu đi kèm.',
        agent_profile: this.profile,
        data: {
          query: input.query,
          dashboard,
          supplier_performance: supplierPerformance,
          alerts,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[QcComplianceCheckerAgent] Error:`, errorMsg);
      
      return {
        status: 'error',
        message: `Lỗi xử lý QC: ${errorMsg}`,
        assistant_reply: `Xin lỗi, tôi gặp lỗi: ${errorMsg}. Vui lòng thử lại.`,
        agent_profile: this.profile,
        data: {},
      };
    }
  }

  private toStringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private isQcDomainQuery(query: string, action: string): boolean {
    if (action === 'submit_decision') {
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

    const keywords = [
      'qc',
      'quality',
      'compliance',
      'kiem tra',
      'kiểm tra',
      'chat luong',
      'chất lượng',
      'reject',
      'accepted',
      'hold',
    ];

    return keywords.some((keyword) => normalized.includes(keyword));
  }
}
