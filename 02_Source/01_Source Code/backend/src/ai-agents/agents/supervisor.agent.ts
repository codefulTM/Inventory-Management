import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentHandlerInput,
  AgentIntent,
  AgentRouteResult,
} from '../ai-agents.types';
import { InventoryAnalystAgent } from './inventory-analyst.agent';
import { WarehouseOperatorAgent } from './warehouse-operator.agent';
import { QcComplianceCheckerAgent } from './qc-compliance-checker.agent';

interface RoutingDecision {
  intent: AgentIntent;
  confidence: number;
  reason: string;
}

@Injectable()
export class SupervisorAgent {
  private readonly logger = new Logger(SupervisorAgent.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly inventoryAnalystAgent: InventoryAnalystAgent,
    private readonly warehouseOperatorAgent: WarehouseOperatorAgent,
    private readonly qcComplianceCheckerAgent: QcComplianceCheckerAgent,
  ) {}

  async route(input: AgentHandlerInput): Promise<AgentRouteResult> {
    const decision = await this.classifyIntent(input.query, input.action);

    let result;
    switch (decision.intent) {
      case AgentIntent.WAREHOUSE_OPERATOR:
        result = await this.warehouseOperatorAgent.handle(input);
        break;
      case AgentIntent.QC_COMPLIANCE_CHECKER:
        result = await this.qcComplianceCheckerAgent.handle(input);
        break;
      case AgentIntent.INVENTORY_ANALYST:
      default:
        result = await this.inventoryAnalystAgent.handle(input);
        break;
    }

    return {
      intent: decision.intent,
      confidence: decision.confidence,
      reason: decision.reason,
      result,
      timestamp: new Date().toISOString(),
    };
  }

  private async classifyIntent(
    query: string,
    action?: string,
  ): Promise<RoutingDecision> {
    const normalized = `${action || ''} ${query || ''}`.toLowerCase();

    const ruleDecision = this.ruleBasedIntent(normalized);
    if (ruleDecision.confidence >= 0.8) {
      return ruleDecision;
    }

    const aiRoutingEnabled =
      this.configService.get<string>('USE_GEMINI_ROUTER') === 'true';
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    if (aiRoutingEnabled && apiKey) {
      const aiDecision = await this.tryGeminiClassification(
        query,
        action,
        apiKey,
      );
      if (aiDecision) {
        return aiDecision;
      }
    }

    return ruleDecision;
  }

  private ruleBasedIntent(text: string): RoutingDecision {
    const warehouseKeywords = [
      'warehouse',
      'stock in',
      'stock-in',
      'barcode',
      'assign',
      'location',
      'create lot',
      'nhap kho',
      'gan kho',
    ];
    const qcKeywords = [
      'qc',
      'quality',
      'compliance',
      'reject',
      'accept',
      'hold',
      'audit',
      'kiem tra',
      'chat luong',
    ];
    const analystKeywords = [
      'analysis',
      'insight',
      'report',
      'dashboard',
      'summary',
      'trend',
      'inventory',
      'transaction',
      'bao cao',
    ];

    if (warehouseKeywords.some((k) => text.includes(k))) {
      return {
        intent: AgentIntent.WAREHOUSE_OPERATOR,
        confidence: 0.9,
        reason: 'Matched warehouse operation keywords.',
      };
    }

    if (qcKeywords.some((k) => text.includes(k))) {
      return {
        intent: AgentIntent.QC_COMPLIANCE_CHECKER,
        confidence: 0.88,
        reason: 'Matched QC and compliance keywords.',
      };
    }

    if (analystKeywords.some((k) => text.includes(k))) {
      return {
        intent: AgentIntent.INVENTORY_ANALYST,
        confidence: 0.82,
        reason: 'Matched inventory analysis keywords.',
      };
    }

    return {
      intent: AgentIntent.INVENTORY_ANALYST,
      confidence: 0.6,
      reason: 'No strong keyword match; defaulted to inventory analyst.',
    };
  }

  private async tryGeminiClassification(
    query: string,
    action: string | undefined,
    apiKey: string,
  ): Promise<RoutingDecision | null> {
    try {
      const model =
        this.configService.get<string>('GEMINI_ROUTER_MODEL') ||
        'gemini-1.5-flash';

      const prompt = [
        'You are an intent classifier for an inventory management system.',
        'Classify into exactly one label:',
        `${AgentIntent.INVENTORY_ANALYST}, ${AgentIntent.WAREHOUSE_OPERATOR}, ${AgentIntent.QC_COMPLIANCE_CHECKER}`,
        'Return strict JSON: {"intent":"...","confidence":0.0,"reason":"..."}',
        `action: ${action || ''}`,
        `query: ${query}`,
      ].join('\n');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 120,
            },
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Gemini routing failed with status ${response.status}`,
        );
        return null;
      }

      const payload: unknown = await response.json();
      const payloadObj =
        typeof payload === 'object' && payload !== null
          ? (payload as Record<string, unknown>)
          : null;

      const candidates = payloadObj?.candidates;
      const candidateList = Array.isArray(candidates)
        ? (candidates as Array<Record<string, unknown>>)
        : [];
      const firstCandidate = candidateList[0];
      const content =
        firstCandidate && typeof firstCandidate.content === 'object'
          ? (firstCandidate.content as Record<string, unknown>)
          : null;
      const parts = Array.isArray(content?.parts)
        ? (content?.parts as Array<Record<string, unknown>>)
        : [];
      const firstPart = parts[0];
      const text: string | undefined =
        firstPart && typeof firstPart.text === 'string'
          ? firstPart.text
          : undefined;
      if (!text) {
        return null;
      }

      const parsed = JSON.parse(text) as {
        intent: AgentIntent;
        confidence: number;
        reason: string;
      };

      if (!Object.values(AgentIntent).includes(parsed.intent)) {
        return null;
      }

      return {
        intent: parsed.intent,
        confidence:
          typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
        reason: parsed.reason || 'Gemini classification',
      };
    } catch (error) {
      this.logger.warn(
        `Gemini classification parsing failed: ${String(error)}`,
      );
      return null;
    }
  }
}
