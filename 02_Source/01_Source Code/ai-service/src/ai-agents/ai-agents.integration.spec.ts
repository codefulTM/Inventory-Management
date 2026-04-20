/**
 * Integration tests — ai-service SupervisorAgent pipeline
 *
 * Tests the full routing pipeline:
 *   SupervisorAgent → (domain hint routing) → SpecialistAgent.handle()
 *
 * Gemini LLM calls are disabled (USE_GEMINI_ROUTER=false) so routing uses
 * only the deterministic domain-hint logic. Specialist agents are mocked to
 * return controlled outputs, isolating the supervisor routing logic.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SupervisorAgent } from "./agents/supervisor.agent";
import { InventoryAnalystAgent } from "./agents/inventory-analyst.agent";
import { WarehouseOperatorAgent } from "./agents/warehouse-operator.agent";
import { QcComplianceCheckerAgent } from "./agents/qc-compliance-checker.agent";
import { AgentIntent } from "./ai-agents.types";

// ── mock specialist agents ─────────────────────────────────────────────────

const inventoryResult = {
  status: "ok" as const,
  message: "Inventory analysis complete",
  assistant_reply: "Có 3 lô sắp hết hạn trong 30 ngày tới.",
  data: { expiring_soon: [] },
};

const warehouseResult = {
  status: "ok" as const,
  message: "Warehouse operation complete",
  assistant_reply: "Lô đã được tạo thành công.",
  data: { lot_id: "lot-new-001" },
};

const qcResult = {
  status: "ok" as const,
  message: "QC check complete",
  assistant_reply: "Lô đạt tiêu chuẩn QC.",
  data: { decision: "approved" },
};

const mockInventoryAgent = {
  handle: jest.fn().mockResolvedValue(inventoryResult),
};
const mockWarehouseAgent = {
  handle: jest.fn().mockResolvedValue(warehouseResult),
};
const mockQcAgent = { handle: jest.fn().mockResolvedValue(qcResult) };

const transcriptPrompts = [
  {
    query: "Hàng còn hạn dưới 1 tháng",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
  {
    query: "Các lô đã hết hạn",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
  {
    query: "Hàng sắp hết hạn",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
  {
    query: "Tổng quan tồn kho hiện tại",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
  {
    query: "Tóm tắt các lot QC fail gần đây và đề xuất hành động ưu tiên.",
    action: "qc_risk_scan",
    expectedIntent: AgentIntent.QC_COMPLIANCE_CHECKER,
  },
  {
    query: "Cho mình xem các lô cận date trong 45 ngày tới",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
  {
    query: "Lot nào near expiry trong 2 tuần?",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
  {
    query: "Stock overview hiện tại giúp mình",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
  {
    query: "Inventory status now",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
  {
    query: "Hàng hết date rồi chưa?",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
  {
    query: "Báo cáo hạn dùng theo batch tuần này",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
  {
    query: "Nhập lô nguyên liệu mới vào kho",
    action: "create_lot",
    expectedIntent: AgentIntent.WAREHOUSE_OPERATOR,
  },
  {
    query: "Generate barcode cho lô mới",
    action: "generate_barcode",
    expectedIntent: AgentIntent.WAREHOUSE_OPERATOR,
  },
  {
    query: "Quality compliance summary cho các lô rủi ro",
    action: "qc_risk_scan",
    expectedIntent: AgentIntent.QC_COMPLIANCE_CHECKER,
  },
  {
    query: "Lấy cho tôi 10 inventory transaction gần đây nhất",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
  {
    query: "Cho mình xem lịch sử giao dịch kho mới nhất",
    action: "inventory_summary",
    expectedIntent: AgentIntent.INVENTORY_ANALYST,
  },
] as const;

async function buildSupervisor(): Promise<SupervisorAgent> {
  const testModule: TestingModule = await Test.createTestingModule({
    providers: [
      SupervisorAgent,
      { provide: InventoryAnalystAgent, useValue: mockInventoryAgent },
      { provide: WarehouseOperatorAgent, useValue: mockWarehouseAgent },
      { provide: QcComplianceCheckerAgent, useValue: mockQcAgent },
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string) => {
            if (key === "USE_GEMINI_ROUTER") return "false"; // disable LLM routing
            return undefined;
          }),
        },
      },
    ],
  }).compile();

  return testModule.get<SupervisorAgent>(SupervisorAgent);
}

describe("SupervisorAgent pipeline (integration)", () => {
  let supervisor: SupervisorAgent;

  const expectOnlyTargetAgentCalled = (intent: AgentIntent) => {
    if (intent === AgentIntent.INVENTORY_ANALYST) {
      expect(mockInventoryAgent.handle).toHaveBeenCalledTimes(1);
      expect(mockWarehouseAgent.handle).not.toHaveBeenCalled();
      expect(mockQcAgent.handle).not.toHaveBeenCalled();
      return;
    }

    if (intent === AgentIntent.WAREHOUSE_OPERATOR) {
      expect(mockWarehouseAgent.handle).toHaveBeenCalledTimes(1);
      expect(mockInventoryAgent.handle).not.toHaveBeenCalled();
      expect(mockQcAgent.handle).not.toHaveBeenCalled();
      return;
    }

    if (intent === AgentIntent.QC_COMPLIANCE_CHECKER) {
      expect(mockQcAgent.handle).toHaveBeenCalledTimes(1);
      expect(mockInventoryAgent.handle).not.toHaveBeenCalled();
      expect(mockWarehouseAgent.handle).not.toHaveBeenCalled();
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    supervisor = await buildSupervisor();
  });

  // ── greeting detection ────────────────────────────────────────────────

  describe("Greeting handling", () => {
    const greetings = ["xin chào", "hello", "hi", "alo", "chào"];

    greetings.forEach((greeting) => {
      it(`"${greeting}" is handled as greeting without calling any specialist`, async () => {
        const result = await supervisor.route({ query: greeting });

        expect(result.intent).toBe(AgentIntent.UNKNOWN);
        expect((result.result as any).assistant_reply).toContain("Xin chào");
        expect(mockInventoryAgent.handle).not.toHaveBeenCalled();
        expect(mockWarehouseAgent.handle).not.toHaveBeenCalled();
        expect(mockQcAgent.handle).not.toHaveBeenCalled();
      });
    });
  });

  // ── domain-hint routing — inventory ──────────────────────────────────

  describe("Inventory domain routing", () => {
    it('routes "sắp hết hạn" query to InventoryAnalystAgent', async () => {
      const result = await supervisor.route({
        query: "Danh sách lô sắp hết hạn",
      });

      expect(result.intent).toBe(AgentIntent.INVENTORY_ANALYST);
      expect(mockInventoryAgent.handle).toHaveBeenCalledTimes(1);
      expect(result.result).toEqual(inventoryResult);
    });

    it('routes "tồn kho" query to InventoryAnalystAgent', async () => {
      const result = await supervisor.route({
        query: "Báo cáo tồn kho hiện tại",
      });

      expect(result.intent).toBe(AgentIntent.INVENTORY_ANALYST);
      expect(mockInventoryAgent.handle).toHaveBeenCalledTimes(1);
    });

    it("routes action=inventory_analyst to InventoryAnalystAgent", async () => {
      const result = await supervisor.route({
        query: "Show me stats",
        action: "inventory_analyst",
      });

      expect(result.intent).toBe(AgentIntent.INVENTORY_ANALYST);
    });
  });

  // ── domain-hint routing — warehouse ──────────────────────────────────

  describe("Warehouse domain routing", () => {
    it('routes "nhập lô" query to WarehouseOperatorAgent', async () => {
      const result = await supervisor.route({ query: "Tôi muốn nhập lô mới" });

      expect(result.intent).toBe(AgentIntent.WAREHOUSE_OPERATOR);
      expect(mockWarehouseAgent.handle).toHaveBeenCalledTimes(1);
      expect(result.result).toEqual(warehouseResult);
    });

    it("routes action=create_lot to WarehouseOperatorAgent", async () => {
      const result = await supervisor.route({
        query: "Tạo lô hàng mới",
        action: "create_lot",
        payload: { material_id: "MAT-001" },
      });

      expect(result.intent).toBe(AgentIntent.WAREHOUSE_OPERATOR);
    });

    it("passes payload through to the specialist agent", async () => {
      const payload = { material_id: "MAT-001", quantity: 500 };
      await supervisor.route({
        query: "Tạo lô",
        action: "create_lot",
        payload,
      });

      expect(mockWarehouseAgent.handle).toHaveBeenCalledWith(
        expect.objectContaining({ payload }),
      );
    });
  });

  // ── domain-hint routing — QC ──────────────────────────────────────────

  describe("QC domain routing", () => {
    it('routes "kiểm tra chất lượng" query to QcComplianceCheckerAgent', async () => {
      const result = await supervisor.route({
        query: "Kiểm tra chất lượng lô LOT-001",
      });

      expect(result.intent).toBe(AgentIntent.QC_COMPLIANCE_CHECKER);
      expect(mockQcAgent.handle).toHaveBeenCalledTimes(1);
      expect(result.result).toEqual(qcResult);
    });

    it("routes action=submit_decision to QcComplianceCheckerAgent", async () => {
      const result = await supervisor.route({
        query: "Submit QC decision",
        action: "submit_decision",
      });

      expect(result.intent).toBe(AgentIntent.QC_COMPLIANCE_CHECKER);
    });
  });

  // ── fallback for out-of-domain ────────────────────────────────────────

  describe("Fallback for unknown intent", () => {
    it("returns fallback for unrelated query", async () => {
      const result = await supervisor.route({
        query: "How is the weather today?",
      });

      expect(result.intent).toBe(AgentIntent.UNKNOWN);
      expect((result.result as any).assistant_reply).toContain(
        "hotro@gmail.com",
      );
      expect(mockInventoryAgent.handle).not.toHaveBeenCalled();
      expect(mockWarehouseAgent.handle).not.toHaveBeenCalled();
      expect(mockQcAgent.handle).not.toHaveBeenCalled();
    });
  });

  // ── result shape validation ───────────────────────────────────────────

  describe("AgentRouteResult shape", () => {
    it("always includes intent, confidence, reason, result, timestamp", async () => {
      const result = await supervisor.route({ query: "Tồn kho báo cáo" });

      expect(result).toHaveProperty("intent");
      expect(result).toHaveProperty("confidence");
      expect(typeof result.confidence).toBe("number");
      expect(result).toHaveProperty("reason");
      expect(result).toHaveProperty("result");
      expect(result).toHaveProperty("timestamp");
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it("result has status field", async () => {
      const result = await supervisor.route({ query: "Tồn kho" });

      expect(result.result).toHaveProperty("status");
    });
  });

  // ── error resilience ──────────────────────────────────────────────────

  describe("Error handling", () => {
    it("returns fallback when specialist agent throws", async () => {
      mockInventoryAgent.handle.mockRejectedValueOnce(new Error("LLM timeout"));

      const result = await supervisor.route({ query: "Báo cáo tồn kho" });

      // Supervisor catches error and falls back gracefully
      expect(result.intent).toBe(AgentIntent.UNKNOWN);
      expect(result.result).toHaveProperty("assistant_reply");
    });
  });

  describe("Transcript routing coverage", () => {
    it.each(transcriptPrompts)(
      'routes explicit action prompt "$query" to $expectedIntent',
      async ({ query, action, expectedIntent }) => {
        const result = await supervisor.route({
          query,
          action,
          payload: { userRole: "manager" },
        });

        expect(result.intent).toBe(expectedIntent);
        expectOnlyTargetAgentCalled(expectedIntent);
      },
    );

    it.each(transcriptPrompts)(
      'routes inferred action prompt "$query" to $expectedIntent',
      async ({ query, expectedIntent }) => {
        const result = await supervisor.route({
          query,
          payload: { userRole: "manager" },
        });

        expect(result.intent).toBe(expectedIntent);
        expectOnlyTargetAgentCalled(expectedIntent);
      },
    );
  });
});
