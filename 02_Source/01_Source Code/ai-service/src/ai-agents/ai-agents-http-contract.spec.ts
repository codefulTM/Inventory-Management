/**
 * Contract tests — ai-service HTTP API (ai-agents & ai endpoints)
 *
 * Verifies request/response shapes for the ai-service REST API.
 * Uses NestJS HTTP testing app with mocked service layer.
 * No real LLM calls or backend data fetches.
 */
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as supertest from "supertest";
const request = (supertest as any).default ?? supertest;
import { AiAgentsController } from "./ai-agents.controller";
import { SupervisorAgent } from "./agents/supervisor.agent";
import { InventoryAnalystAgent } from "./agents/inventory-analyst.agent";
import { WarehouseOperatorAgent } from "./agents/warehouse-operator.agent";
import { QcComplianceCheckerAgent } from "./agents/qc-compliance-checker.agent";

// ── mock supervisor result ──────────────────────────────────────────────────

const supervisorResult = {
  intent: "inventory_analyst",
  confidence: 0.95,
  reason: "Query about expiry lots matches inventory domain",
  result: {
    status: "ok",
    message: "Analysis complete",
    assistant_reply: "Có 3 lô sắp hết hạn trong 30 ngày tới.",
    data: { expiring_lots: [] },
  },
  timestamp: new Date().toISOString(),
};

const mockSupervisor = {
  route: jest.fn().mockResolvedValue(supervisorResult),
};

const mockSpecialists = {
  handle: jest
    .fn()
    .mockResolvedValue({
      status: "ok",
      message: "done",
      assistant_reply: "done",
      data: {},
    }),
};

describe("AiAgentsController HTTP contract", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      controllers: [AiAgentsController],
      providers: [
        { provide: SupervisorAgent, useValue: mockSupervisor },
        { provide: InventoryAnalystAgent, useValue: mockSpecialists },
        { provide: WarehouseOperatorAgent, useValue: mockSpecialists },
        { provide: QcComplianceCheckerAgent, useValue: mockSpecialists },
      ],
    }).compile();

    app = testModule.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  // ── POST /ai-agents/route ─────────────────────────────────────────────

  describe("POST /ai-agents/route", () => {
    it("accepts { query } and returns { success, data } envelope", async () => {
      const response = await request(app.getHttpServer())
        .post("/ai-agents/route")
        .send({ query: "Kiểm tra tồn kho sắp hết hạn" })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
    });

    it("data contains intent, confidence, reason, result, timestamp", async () => {
      const response = await request(app.getHttpServer())
        .post("/ai-agents/route")
        .send({ query: "Báo cáo tồn kho" })
        .expect(201);

      const data = response.body.data;
      expect(data).toHaveProperty("intent");
      expect(data).toHaveProperty("confidence");
      expect(data).toHaveProperty("reason");
      expect(data).toHaveProperty("result");
      expect(data).toHaveProperty("timestamp");
    });

    it("forwards query, action, payload to supervisor.route()", async () => {
      await request(app.getHttpServer())
        .post("/ai-agents/route")
        .send({
          query: "Tạo lô mới",
          action: "create_lot",
          payload: { material_id: "MAT-001" },
        })
        .expect(201);

      expect(mockSupervisor.route).toHaveBeenCalledWith({
        query: "Tạo lô mới",
        action: "create_lot",
        payload: { material_id: "MAT-001" },
      });
    });

    it("returns 400 when query is missing", async () => {
      await request(app.getHttpServer())
        .post("/ai-agents/route")
        .send({ action: "create_lot" })
        .expect(400);
    });

    it("returns 400 when query exceeds 4000 characters", async () => {
      await request(app.getHttpServer())
        .post("/ai-agents/route")
        .send({ query: "A".repeat(4001) })
        .expect(400);
    });

    it("result.assistant_reply is a string", async () => {
      const response = await request(app.getHttpServer())
        .post("/ai-agents/route")
        .send({ query: "test query" })
        .expect(201);

      expect(typeof response.body.data.result.assistant_reply).toBe("string");
    });
  });

  // ── GET /ai-agents/health ─────────────────────────────────────────────

  describe("GET /ai-agents/health", () => {
    it("returns 200 with success=true", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-agents/health")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    it("response contains timestamp as ISO string", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-agents/health")
        .expect(200);

      expect(typeof response.body.timestamp).toBe("string");
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    it("response contains agents object with all 4 agent keys", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-agents/health")
        .expect(200);

      expect(response.body).toHaveProperty("agents");
      expect(response.body.agents).toHaveProperty("supervisor");
      expect(response.body.agents).toHaveProperty("inventory_analyst");
      expect(response.body.agents).toHaveProperty("warehouse_operator");
      expect(response.body.agents).toHaveProperty("qc_compliance_checker");
    });

    it("each agent entry has name, description, status fields", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-agents/health")
        .expect(200);

      const supervisor = response.body.agents.supervisor;
      expect(supervisor).toHaveProperty("name");
      expect(supervisor).toHaveProperty("description");
      expect(supervisor).toHaveProperty("status");
    });

    it("response contains llm section with provider field", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-agents/health")
        .expect(200);

      expect(response.body).toHaveProperty("llm");
      expect(response.body.llm).toHaveProperty("provider");
    });
  });
});
