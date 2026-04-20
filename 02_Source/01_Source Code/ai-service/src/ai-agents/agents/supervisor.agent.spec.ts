import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupervisorAgent } from './supervisor.agent';
import { InventoryAnalystAgent } from './inventory-analyst.agent';
import { WarehouseOperatorAgent } from './warehouse-operator.agent';
import { QcComplianceCheckerAgent } from './qc-compliance-checker.agent';
import { AgentIntent, AgentHandlerInput } from '../ai-agents.types';

const okResult = {
  status: 'ok' as const,
  message: 'handled',
  assistant_reply: 'response text',
  data: {},
};

let supervisor: SupervisorAgent;
let inventoryAgent: jest.Mocked<Pick<InventoryAnalystAgent, 'handle'>>;
let warehouseAgent: jest.Mocked<Pick<WarehouseOperatorAgent, 'handle'>>;
let qcAgent: jest.Mocked<Pick<QcComplianceCheckerAgent, 'handle'>>;
let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

beforeEach(async () => {
  inventoryAgent = { handle: jest.fn().mockResolvedValue(okResult) };
  warehouseAgent = { handle: jest.fn().mockResolvedValue(okResult) };
  qcAgent = { handle: jest.fn().mockResolvedValue(okResult) };
  configService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'USE_GEMINI_ROUTER') return 'false'; // disable LLM by default
      return undefined;
    }),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SupervisorAgent,
      { provide: ConfigService, useValue: configService },
      { provide: InventoryAnalystAgent, useValue: inventoryAgent },
      { provide: WarehouseOperatorAgent, useValue: warehouseAgent },
      { provide: QcComplianceCheckerAgent, useValue: qcAgent },
    ],
  }).compile();

  supervisor = module.get<SupervisorAgent>(SupervisorAgent);
});

// ── greeting detection ─────────────────────────────────────────────────────

describe('greeting queries', () => {
  it('handles "xin chào" without calling any specialist agent', async () => {
    const input: AgentHandlerInput = { query: 'xin chào' };

    const result = await supervisor.route(input);

    expect(inventoryAgent.handle).not.toHaveBeenCalled();
    expect(warehouseAgent.handle).not.toHaveBeenCalled();
    expect(qcAgent.handle).not.toHaveBeenCalled();
    expect(result.result).toHaveProperty('assistant_reply');
  });

  it('handles "hello" greeting without calling any specialist agent', async () => {
    const input: AgentHandlerInput = { query: 'hello' };

    const result = await supervisor.route(input);

    expect(inventoryAgent.handle).not.toHaveBeenCalled();
  });
});

// ── domain hint routing (Gemini disabled) ─────────────────────────────────

describe('domain hint routing (no LLM)', () => {
  it('routes "tồn kho" query to inventory analyst', async () => {
    const input: AgentHandlerInput = { query: 'kiểm tra tồn kho vật tư hiện tại', action: 'inventory_analyst' };

    const result = await supervisor.route(input);

    expect(inventoryAgent.handle).toHaveBeenCalledTimes(1);
    expect(result.intent).toBe(AgentIntent.INVENTORY_ANALYST);
  });

  it('routes "nhập kho" query to warehouse operator', async () => {
    const input: AgentHandlerInput = { query: 'nhập kho lô hàng mới', action: 'warehouse_operator' };

    const result = await supervisor.route(input);

    expect(warehouseAgent.handle).toHaveBeenCalledTimes(1);
    expect(result.intent).toBe(AgentIntent.WAREHOUSE_OPERATOR);
  });

  it('routes "kiểm định chất lượng" to qc compliance checker', async () => {
    const input: AgentHandlerInput = { query: 'kết quả kiểm định chất lượng lô LOT-001', action: 'qc_compliance_checker' };

    const result = await supervisor.route(input);

    expect(qcAgent.handle).toHaveBeenCalledTimes(1);
    expect(result.intent).toBe(AgentIntent.QC_COMPLIANCE_CHECKER);
  });
});

// ── fallback for unknown / low-confidence ─────────────────────────────────

describe('fallback for unsupported queries', () => {
  it('returns fallback result for completely out-of-domain query', async () => {
    const input: AgentHandlerInput = { query: 'thời tiết ngày mai thế nào' };

    const result = await supervisor.route(input);

    // No specialist called
    expect(inventoryAgent.handle).not.toHaveBeenCalled();
    expect(warehouseAgent.handle).not.toHaveBeenCalled();
    expect(qcAgent.handle).not.toHaveBeenCalled();
    // Result should have a fallback message
    expect(result.result).toBeDefined();
  });
});

// ── error handling ─────────────────────────────────────────────────────────

describe('error handling', () => {
  it('returns fallback result when specialist agent throws', async () => {
    inventoryAgent.handle.mockRejectedValue(new Error('DB connection failed'));

    const input: AgentHandlerInput = { query: 'kiểm tra tồn kho', action: 'inventory_analyst' };

    const result = await supervisor.route(input);

    // Should not propagate — supervisor catches and returns fallback
    expect(result).toBeDefined();
    expect(result.confidence).toBeDefined();
  });
});

// ── result shape ──────────────────────────────────────────────────────────

describe('result shape', () => {
  it('result always includes intent, confidence, reason, result, timestamp', async () => {
    const input: AgentHandlerInput = { query: 'xin chào' };

    const result = await supervisor.route(input);

    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('result');
    expect(result).toHaveProperty('timestamp');
  });
});
