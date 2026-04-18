import { Test } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import { ClientGrpc, ClientsModule, MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom } from 'rxjs';
import { AppModule } from '../../src/app.module';
import { ELASTICSEARCH_CLIENT } from '../../src/elasticsearch/elasticsearch.constants';

// ─── gRPC response shapes ──────────────────────────────────────────────────
interface InventoryStatusResponse {
  generated_at: string;
  total_lots: number;
  items: { material_id: string; lot_id: string; quantity: number; status: string; expiration_date: string }[];
}
interface MaterialUsageResponse {
  generated_at: string;
  from: string;
  to: string;
  items: { material_id: string; transaction_count: number; total_quantity: number }[];
}
interface QcPerformanceResponse {
  generated_at: string;
  items: { supplier_name: string; approved: number; rejected: number; quality_rate: number }[];
}
interface AuditReportResponse {
  generated_at: string;
  entries: { action: string; entity: string; performed_by: string; performed_at: string; details: string }[];
}
interface MetricsReportsGrpc {
  GetInventoryStatus(data: object): Observable<InventoryStatusResponse>;
  GetMaterialUsage(data: { from?: string; to?: string }): Observable<MaterialUsageResponse>;
  GetQcPerformance(data: object): Observable<QcPerformanceResponse>;
  GetAuditReport(data: { page?: number; size?: number }): Observable<AuditReportResponse>;
}

/**
 * E2E test for metrics-service gRPC microservice.
 * Spins up the real NestJS gRPC server on a test port,
 * overrides the ES client with a mock, and calls each RPC
 * via a real gRPC client connection.
 */
const TEST_GRPC_PORT = 16741;

const mockEs = {
  search: jest.fn(),
};

describe('MetricsReportsService (gRPC e2e)', () => {
  let app: INestMicroservice;
  let reportsService: MetricsReportsGrpc;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ELASTICSEARCH_CLIENT)
      .useValue(mockEs)
      .compile();

    app = moduleRef.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'metrics',
        protoPath: join(__dirname, '../../proto/metrics.proto'),
        url: `0.0.0.0:${TEST_GRPC_PORT}`,
        loader: { keepCase: true, longs: String, enums: String, defaults: false, oneofs: true },
      },
    });

    await app.listen();

    // Build a real gRPC client pointing at the test server
    const clientModule = await Test.createTestingModule({
      imports: [
        ClientsModule.register([
          {
            name: 'METRICS_TEST_CLIENT',
            transport: Transport.GRPC,
            options: {
              package: 'metrics',
              protoPath: join(__dirname, '../../proto/metrics.proto'),
              url: `localhost:${TEST_GRPC_PORT}`,
              loader: { keepCase: true, longs: String, enums: String, defaults: false, oneofs: true },
            },
          },
        ]),
      ],
    }).compile();

    const grpcClient = clientModule.get<ClientGrpc>('METRICS_TEST_CLIENT');
    reportsService = grpcClient.getService<MetricsReportsGrpc>('MetricsReportsService');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── GetInventoryStatus ────────────────────────────────────────────────────

  describe('GetInventoryStatus', () => {
    it('returns inventory status report with items', async () => {
      mockEs.search.mockResolvedValue({
        aggregations: {
          by_status: {
            buckets: [
              {
                key: 'Accepted',
                sample_lots: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          material_id: 'MAT-01',
                          lot_id: 'LOT-01',
                          quantity: 100,
                          status: 'Accepted',
                          expiration_date: '2026-12-31T00:00:00Z',
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      });

      const result = await firstValueFrom(reportsService.GetInventoryStatus({}));

      expect(result.total_lots).toBe(1);
      expect(result.items[0].lot_id).toBe('LOT-01');
      expect(result.items[0].status).toBe('Accepted');
      expect(result.generated_at).toBeTruthy();
    });

    it('returns empty report when ES has no buckets', async () => {
      mockEs.search.mockResolvedValue({
        aggregations: { by_status: { buckets: [] } },
      });

      const result = await firstValueFrom(reportsService.GetInventoryStatus({}));

      expect(result.total_lots).toBe(0);
      // proto3 omits empty repeated fields — items is undefined when empty
      expect(result.items ?? []).toEqual([]);
    });
  });

  // ─── GetMaterialUsage ──────────────────────────────────────────────────────

  describe('GetMaterialUsage', () => {
    it('returns material usage with date range', async () => {
      mockEs.search.mockResolvedValue({
        aggregations: {
          by_material: {
            buckets: [
              { key: 'MAT-02', transaction_count: { value: 5 }, total_quantity: { value: 250 } },
            ],
          },
        },
      });

      const result = await firstValueFrom(
        reportsService.GetMaterialUsage({ from: '2026-01-01', to: '2026-03-31' }),
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].material_id).toBe('MAT-02');
      expect(result.items[0].transaction_count).toBe(5);
      expect(result.items[0].total_quantity).toBe(250);
      expect(result.from).toBeTruthy();
      expect(result.to).toBeTruthy();
    });

    it('returns report with no date range (match_all)', async () => {
      mockEs.search.mockResolvedValue({
        aggregations: { by_material: { buckets: [] } },
      });

      const result = await firstValueFrom(reportsService.GetMaterialUsage({}));

      // proto3 omits empty repeated fields — items is undefined when empty
      expect(result.items ?? []).toEqual([]);
      expect(result.from).toBe('');
      expect(result.to).toBe('');
    });
  });

  // ─── GetQcPerformance ──────────────────────────────────────────────────────

  describe('GetQcPerformance', () => {
    it('returns qc performance with quality rate', async () => {
      mockEs.search.mockResolvedValue({
        aggregations: {
          by_supplier: {
            buckets: [
              {
                key: 'Supplier A',
                by_result: {
                  buckets: [
                    { key: 'Pass', doc_count: 9 },
                    { key: 'Fail', doc_count: 1 },
                  ],
                },
              },
            ],
          },
        },
      });

      const result = await firstValueFrom(reportsService.GetQcPerformance({}));

      expect(result.items).toHaveLength(1);
      expect(result.items[0].supplier_name).toBe('Supplier A');
      expect(result.items[0].approved).toBe(9);
      expect(result.items[0].rejected).toBe(1);
      expect(result.items[0].quality_rate).toBe(90);
    });
  });

  // ─── GetAuditReport ────────────────────────────────────────────────────────

  describe('GetAuditReport', () => {
    it('returns audit entries sorted by date', async () => {
      mockEs.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                action: 'UPDATE',
                entity: 'InventoryLot',
                performed_by: 'user-manager',
                performed_at: '2026-04-15T08:00:00Z',
                details: { field: 'status', old: 'Pending', new: 'Accepted' },
              },
            },
          ],
        },
      });

      const result = await firstValueFrom(
        reportsService.GetAuditReport({ page: 0, size: 20 }),
      );

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].action).toBe('UPDATE');
      expect(result.entries[0].entity).toBe('InventoryLot');
      expect(result.entries[0].performed_by).toBe('user-manager');
      expect(result.entries[0].performed_at).toBeTruthy();
    });

    it('returns empty entries when no audit logs', async () => {
      mockEs.search.mockResolvedValue({ hits: { hits: [] } });

      const result = await firstValueFrom(reportsService.GetAuditReport({ page: 0, size: 20 }));

      // proto3 omits empty repeated fields — entries is undefined when empty
      expect(result.entries ?? []).toEqual([]);
    });
  });
});
