import { Test } from "@nestjs/testing";
import { INestMicroservice } from "@nestjs/common";
import {
  ClientGrpc,
  ClientsModule,
  MicroserviceOptions,
  Transport,
} from "@nestjs/microservices";
import { join } from "path";
import { Observable, firstValueFrom } from "rxjs";
import { ReportsController } from "../../src/reports/reports.controller";
import { ReportsService } from "../../src/reports/reports.service";
import { ReportsRepository } from "../../src/reports/repositories/reports.repository";

// ─── gRPC response shapes ──────────────────────────────────────────────────
interface InventoryStatusResponse {
  generated_at: string;
  total_lots: number;
  items: {
    material_id: string;
    lot_id: string;
    quantity: number;
    status: string;
    expiration_date: string;
  }[];
}
interface MaterialUsageResponse {
  generated_at: string;
  from: string;
  to: string;
  items: {
    material_id: string;
    transaction_count: number;
    total_quantity: number;
  }[];
}
interface QcPerformanceResponse {
  generated_at: string;
  items: {
    supplier_name: string;
    approved: number;
    rejected: number;
    quality_rate: number;
  }[];
}
interface AuditReportResponse {
  generated_at: string;
  entries: {
    action: string;
    entity: string;
    performed_by: string;
    performed_at: string;
    details: string;
  }[];
}
interface InventoryTrendResponse {
  generated_at: string;
  from: string;
  to: string;
  interval: string;
  points: { period: string; lot_count: number; total_quantity: number }[];
}
interface MaterialUsageTrendResponse {
  generated_at: string;
  from: string;
  to: string;
  interval: string;
  points: {
    period: string;
    material_id: string;
    transaction_count: number;
    total_quantity: number;
  }[];
}
interface QcTrendResponse {
  generated_at: string;
  from: string;
  to: string;
  interval: string;
  points: {
    period: string;
    pass_count: number;
    fail_count: number;
    pending_count: number;
  }[];
  supplier_rankings: {
    supplier_name: string;
    pass_count: number;
    fail_count: number;
    quality_rate: number;
  }[];
}
interface AuditTrendResponse {
  generated_at: string;
  from: string;
  to: string;
  interval: string;
  points: { period: string; activity_count: number; unique_users: number }[];
}
interface MetricsReportsGrpc {
  GetInventoryStatus(data: object): Observable<InventoryStatusResponse>;
  GetMaterialUsage(data: {
    from?: string;
    to?: string;
  }): Observable<MaterialUsageResponse>;
  GetQcPerformance(data: object): Observable<QcPerformanceResponse>;
  GetAuditReport(data: {
    page?: number;
    size?: number;
  }): Observable<AuditReportResponse>;
  GetInventoryTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
  }): Observable<InventoryTrendResponse>;
  GetMaterialUsageTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
  }): Observable<MaterialUsageTrendResponse>;
  GetQcTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
  }): Observable<QcTrendResponse>;
  GetAuditTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
  }): Observable<AuditTrendResponse>;
}

/**
 * E2E test for metrics-service gRPC microservice.
 * Spins up the real NestJS gRPC server on a test port,
 * overrides the ES client with a mock, and calls each RPC
 * via a real gRPC client connection.
 */
const TEST_GRPC_PORT = 16741;

describe("MetricsReportsService (gRPC e2e)", () => {
  let app: INestMicroservice;
  let reportsService: MetricsReportsGrpc;
  const mockRepo: any = {
    getInventoryStatus: jest.fn(),
    getMaterialUsage: jest.fn(),
    getQcPerformance: jest.fn(),
    getAuditTrail: jest.fn(),
    getInventoryTrend: jest.fn(),
    getMaterialUsageTrend: jest.fn(),
    getQcTrend: jest.fn(),
    getAuditTrend: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        ReportsService,
        { provide: ReportsRepository, useValue: mockRepo },
      ],
    }).compile();

    app = moduleRef.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: "metrics",
        protoPath: join(__dirname, "../../proto/metrics.proto"),
        url: `0.0.0.0:${TEST_GRPC_PORT}`,
        loader: {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: false,
          oneofs: true,
        },
      },
    });

    await app.listen();

    // Build a real gRPC client pointing at the test server
    const clientModule = await Test.createTestingModule({
      imports: [
        ClientsModule.register([
          {
            name: "METRICS_TEST_CLIENT",
            transport: Transport.GRPC,
            options: {
              package: "metrics",
              protoPath: join(__dirname, "../../proto/metrics.proto"),
              url: `localhost:${TEST_GRPC_PORT}`,
              loader: {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: false,
                oneofs: true,
              },
            },
          },
        ]),
      ],
    }).compile();

    const grpcClient = clientModule.get<ClientGrpc>("METRICS_TEST_CLIENT");
    reportsService = grpcClient.getService<MetricsReportsGrpc>(
      "MetricsReportsService",
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── GetInventoryStatus ────────────────────────────────────────────────────

  describe("GetInventoryStatus", () => {
    it("returns inventory status report with items", async () => {
      mockRepo.getInventoryStatus.mockResolvedValue([
        {
          material_id: "MAT-01",
          lot_id: "LOT-01",
          quantity: 100,
          status: "Accepted",
          expiration_date: new Date("2026-12-31T00:00:00Z"),
        },
      ]);

      const result = await firstValueFrom(
        reportsService.GetInventoryStatus({}),
      );

      expect(result.total_lots).toBe(1);
      expect(result.items[0].lot_id).toBe("LOT-01");
      expect(result.items[0].status).toBe("Accepted");
      expect(result.generated_at).toBeTruthy();
    });

    it("returns empty report when ES has no buckets", async () => {
      mockRepo.getInventoryStatus.mockResolvedValue([]);

      const result = await firstValueFrom(
        reportsService.GetInventoryStatus({}),
      );

      expect(result.total_lots).toBe(0);
      // proto3 omits empty repeated fields — items is undefined when empty
      expect(result.items ?? []).toEqual([]);
    });
  });

  // ─── GetMaterialUsage ──────────────────────────────────────────────────────

  describe("GetMaterialUsage", () => {
    it("returns material usage with date range", async () => {
      mockRepo.getMaterialUsage.mockResolvedValue([
        { material_id: "MAT-02", transaction_count: 5, total_quantity: 250 },
      ]);

      const result = await firstValueFrom(
        reportsService.GetMaterialUsage({
          from: "2026-01-01",
          to: "2026-03-31",
        }),
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].material_id).toBe("MAT-02");
      expect(result.items[0].transaction_count).toBe(5);
      expect(result.items[0].total_quantity).toBe(250);
      expect(result.from).toBeTruthy();
      expect(result.to).toBeTruthy();
    });

    it("returns report with no date range (match_all)", async () => {
      mockRepo.getMaterialUsage.mockResolvedValue([]);

      const result = await firstValueFrom(reportsService.GetMaterialUsage({}));

      // proto3 omits empty repeated fields — items is undefined when empty
      expect(result.items ?? []).toEqual([]);
      expect(result.from).toBe("");
      expect(result.to).toBe("");
    });
  });

  // ─── GetQcPerformance ──────────────────────────────────────────────────────

  describe("GetQcPerformance", () => {
    it("returns qc performance with quality rate", async () => {
      mockRepo.getQcPerformance.mockResolvedValue([
        {
          supplier_name: "Supplier A",
          approved: 9,
          rejected: 1,
          quality_rate: 90,
        },
      ]);

      const result = await firstValueFrom(reportsService.GetQcPerformance({}));

      expect(result.items).toHaveLength(1);
      expect(result.items[0].supplier_name).toBe("Supplier A");
      expect(result.items[0].approved).toBe(9);
      expect(result.items[0].rejected).toBe(1);
      expect(result.items[0].quality_rate).toBe(90);
    });
  });

  // ─── GetAuditReport ────────────────────────────────────────────────────────

  describe("GetAuditReport", () => {
    it("returns audit entries sorted by date", async () => {
      mockRepo.getAuditTrail.mockResolvedValue([
        {
          action: "UPDATE",
          entity: "InventoryLot",
          performed_by: "user-manager",
          performed_at: new Date("2026-04-15T08:00:00Z"),
          details: { field: "status", old: "Pending", new: "Accepted" },
        },
      ]);

      const result = await firstValueFrom(
        reportsService.GetAuditReport({ page: 0, size: 20 }),
      );

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].action).toBe("UPDATE");
      expect(result.entries[0].entity).toBe("InventoryLot");
      expect(result.entries[0].performed_by).toBe("user-manager");
      expect(result.entries[0].performed_at).toBeTruthy();
    });

    it("returns empty entries when no audit logs", async () => {
      mockRepo.getAuditTrail.mockResolvedValue([]);

      const result = await firstValueFrom(
        reportsService.GetAuditReport({ page: 0, size: 20 }),
      );

      // proto3 omits empty repeated fields — entries is undefined when empty
      expect(result.entries ?? []).toEqual([]);
    });
  });

  // ─── Trend RPCs ───────────────────────────────────────────────────────────

  describe("GetInventoryTrend", () => {
    it("returns inventory trend points", async () => {
      mockRepo.getInventoryTrend.mockResolvedValue([
        { period: "2026-04-01", lot_count: 11, total_quantity: 1200 },
      ]);

      const result = await firstValueFrom(
        reportsService.GetInventoryTrend({
          from: "2026-04-01T00:00:00Z",
          to: "2026-04-30T23:59:59Z",
          interval: "day",
        }),
      );

      expect(result.points).toHaveLength(1);
      expect(result.points[0].lot_count).toBe(11);
      expect(result.points[0].total_quantity).toBe(1200);
    });
  });

  describe("GetMaterialUsageTrend", () => {
    it("returns material usage trend points", async () => {
      mockRepo.getMaterialUsageTrend.mockResolvedValue([
        {
          period: "2026-04-01",
          material_id: "MAT-01",
          transaction_count: 5,
          total_quantity: 250,
        },
      ]);

      const result = await firstValueFrom(
        reportsService.GetMaterialUsageTrend({
          from: "2026-04-01T00:00:00Z",
          to: "2026-04-30T23:59:59Z",
          interval: "day",
          limit: 5,
        }),
      );

      expect(result.points).toHaveLength(1);
      expect(result.points[0].material_id).toBe("MAT-01");
      expect(result.points[0].transaction_count).toBe(5);
    });
  });

  describe("GetQcTrend", () => {
    it("returns qc trend points and supplier rankings", async () => {
      mockRepo.getQcTrend.mockResolvedValue({
        points: [
          {
            period: "2026-04-01",
            pass_count: 8,
            fail_count: 2,
            pending_count: 1,
          },
        ],
        supplier_rankings: [
          {
            supplier_name: "Supplier A",
            pass_count: 8,
            fail_count: 2,
            quality_rate: 80,
          },
        ],
      });

      const result = await firstValueFrom(
        reportsService.GetQcTrend({
          from: "2026-04-01T00:00:00Z",
          to: "2026-04-30T23:59:59Z",
          interval: "day",
          limit: 5,
        }),
      );

      expect(result.points).toHaveLength(1);
      expect(result.supplier_rankings).toHaveLength(1);
      expect(result.supplier_rankings[0].quality_rate).toBe(80);
    });
  });

  describe("GetAuditTrend", () => {
    it("returns audit trend points", async () => {
      mockRepo.getAuditTrend.mockResolvedValue([
        { period: "2026-04-01", activity_count: 25, unique_users: 5 },
      ]);

      const result = await firstValueFrom(
        reportsService.GetAuditTrend({
          from: "2026-04-01T00:00:00Z",
          to: "2026-04-30T23:59:59Z",
          interval: "day",
        }),
      );

      expect(result.points).toHaveLength(1);
      expect(result.points[0].activity_count).toBe(25);
      expect(result.points[0].unique_users).toBe(5);
    });
  });
});
