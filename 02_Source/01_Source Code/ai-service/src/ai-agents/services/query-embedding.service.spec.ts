import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { QueryEmbeddingService } from "./query-embedding.service";

describe("QueryEmbeddingService", () => {
  const buildService = async (overrides?: Record<string, unknown>) => {
    const values: Record<string, unknown> = {
      EMBEDDING_API_URL:
        "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
      HUGGINGFACE_API_KEY: "hf_test_key",
      EMBEDDING_TIMEOUT_MS: 1000,
      EMBEDDING_VECTOR_DIMS: 4,
      ...(overrides || {}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryEmbeddingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => values[key]),
          },
        },
      ],
    }).compile();

    return module.get<QueryEmbeddingService>(QueryEmbeddingService);
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns null when EMBEDDING_API_URL missing", async () => {
    const service = await buildService({ EMBEDDING_API_URL: undefined });

    const vector = await service.embedQuery("hello world");
    expect(vector).toBeNull();
  });

  it("parses and pads single-level vector response", async () => {
    const service = await buildService({ EMBEDDING_VECTOR_DIMS: 5 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [0.2, 0.4, 0.6],
    } as any);

    const vector = await service.embedQuery("inventory query");

    expect(vector).toEqual([0.2, 0.4, 0.6, 0, 0]);
  });

  it("parses first row for nested vector response", async () => {
    const service = await buildService({ EMBEDDING_VECTOR_DIMS: 2 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [[0.9, 0.8, 0.7]],
    } as any);

    const vector = await service.embedQuery("lot traceability");

    expect(vector).toEqual([0.9, 0.8]);
  });

  it("returns null on non-ok response", async () => {
    const service = await buildService();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "service unavailable",
    } as any);

    const vector = await service.embedQuery("query");

    expect(vector).toBeNull();
  });
});
