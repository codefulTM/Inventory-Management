import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("AI Service (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /ai-agents/health", () => {
    it("should return 200 with health status", () => {
      return request(app.getHttpServer())
        .get("/ai-agents/health")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("success", true);
          expect(res.body).toHaveProperty("agents");
          expect(res.body).toHaveProperty("llm");
          expect(res.body.agents).toHaveProperty("supervisor");
          expect(res.body.agents).toHaveProperty("inventory_analyst");
          expect(res.body.agents).toHaveProperty("warehouse_operator");
          expect(res.body.agents).toHaveProperty("qc_compliance_checker");
        });
    });
  });

  describe("GET /ai/test-connection", () => {
    it("should return 200 with connection status", () => {
      return request(app.getHttpServer())
        .get("/ai/test-connection")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("status");
          expect(res.body).toHaveProperty("timestamp");
        });
    });
  });
});
