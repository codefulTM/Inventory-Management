import { Test, TestingModule } from "@nestjs/testing";
import { ProxyController } from "./proxy.controller";
import { ConfigService } from "@nestjs/config";
import { HttpException, HttpStatus } from "@nestjs/common";

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string, def?: string) => {
    if (key === "BACKEND_URL") return undefined;
    if (key === "BACKEND_HTTP_URL") return "http://backend:3001";
    if (key === "AI_SERVICE_URL") return "http://ai-service:3003";
    return def;
  }),
};

const makeReq = (
  overrides: Partial<{
    path: string;
    method: string;
    headers: Record<string, string>;
    body: any;
    query: Record<string, string>;
    hostname: string;
    socket: { remoteAddress: string };
  }> = {},
) => ({
  path: "/inventory-lots",
  method: "GET",
  headers: {},
  body: {},
  query: {},
  hostname: "localhost",
  socket: { remoteAddress: "127.0.0.1" },
  ...overrides,
});

const makeRes = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const makeFetchResponse = (
  status: number,
  body: string,
  contentType = "application/json",
) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: () => contentType },
  text: jest.fn().mockResolvedValue(body),
});

describe("ProxyController", () => {
  let controller: ProxyController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyController],
      providers: [{ provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    controller = module.get<ProxyController>(ProxyController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ── route guarding ────────────────────────────────────────────────────────

  describe("route guarding", () => {
    it("returns 404 for /reports/* without forwarding to upstream", async () => {
      const req = makeReq({ path: "/reports/inventory-status", method: "GET" });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Not Found" });
    });

    it("returns 404 for /reports exact path", async () => {
      const req = makeReq({ path: "/reports", method: "GET" });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ── backend proxying ───────────────────────────────────────────────────────

  describe("backend proxying", () => {
    beforeEach(() => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          makeFetchResponse(200, JSON.stringify({ data: [] })),
        );
    });

    it("forwards GET /inventory-lots to backend", async () => {
      const req = makeReq({ path: "/inventory-lots", method: "GET" });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://backend:3001/inventory-lots",
        expect.objectContaining({ method: "GET" }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("forwards Authorization header to upstream", async () => {
      const req = makeReq({
        path: "/materials",
        method: "GET",
        headers: { authorization: "Bearer token123" },
      });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer token123",
          }),
        }),
      );
    });

    it("includes serialised body for POST requests", async () => {
      const req = makeReq({
        path: "/materials",
        method: "POST",
        body: { material_id: "MAT-001", material_name: "Vitamin D3" },
        headers: { "content-type": "application/json" },
      });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      const call = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(call.body).toContain("MAT-001");
    });

    it("does NOT include body for GET requests", async () => {
      const req = makeReq({ path: "/materials", method: "GET" });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      const call = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(call.body).toBeUndefined();
    });

    it("appends query string parameters to target URL", async () => {
      const req = makeReq({
        path: "/inventory-lots",
        method: "GET",
        query: { page: "1", limit: "20" },
      });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      const url: string = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain("page=1");
      expect(url).toContain("limit=20");
    });
  });

  // ── AI service routing ────────────────────────────────────────────────────

  describe("AI service routing", () => {
    beforeEach(() => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          makeFetchResponse(200, JSON.stringify({ success: true })),
        );
    });

    it("forwards /ai/* to ai-service, not backend", async () => {
      const req = makeReq({ path: "/ai/test-connection", method: "GET" });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      const url: string = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain("ai-service:3003");
      expect(url).not.toContain("backend");
    });

    it("forwards /ai-agents/* to ai-service", async () => {
      const req = makeReq({ path: "/ai-agents/health", method: "GET" });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      const url: string = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain("ai-service:3003/ai-agents/health");
    });

    it("forwards non-AI routes to backend", async () => {
      const req = makeReq({ path: "/materials", method: "GET" });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      const url: string = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain("backend:3001");
      expect(url).not.toContain("ai-service");
    });
  });

  // ── upstream error handling ────────────────────────────────────────────────

  describe("upstream errors", () => {
    it("throws HttpException 502 when fetch fails (network error)", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));

      const req = makeReq({ path: "/materials", method: "GET" });
      const res = makeRes();

      await expect(controller.proxy(req as any, res as any)).rejects.toThrow(
        HttpException,
      );
    });

    it("passes upstream 403 status through to client", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          makeFetchResponse(403, JSON.stringify({ message: "Forbidden" })),
        );

      const req = makeReq({ path: "/admin/users", method: "GET" });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("passes upstream 500 status through to client", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          makeFetchResponse(500, "Internal Server Error", "text/plain"),
        );

      const req = makeReq({ path: "/materials", method: "GET" });
      const res = makeRes();

      await controller.proxy(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
