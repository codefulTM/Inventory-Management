/**
 * Integration tests — metrics-service ReportsRepository + ReportsService
 *
 * Tests the full data transformation pipeline:
 *   ReportsRepository (ES aggregation parsing) → ReportsService (DTO assembly)
 *
 * Uses a mocked Elasticsearch client that returns realistic aggregation payloads.
 * No real ES cluster required.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './repositories/reports.repository';
import { ELASTICSEARCH_CLIENT } from '../elasticsearch/elasticsearch.constants';

// ── Realistic ES aggregation response stubs ────────────────────────────────

const inventoryStatusEsResponse = {
  aggregations: {
    by_status: {
      buckets: [
        {
          key: 'Accepted',
          doc_count: 3,
          total_quantity: { value: 1500 },
          sample_lots: {
            hits: {
              hits: [
                { _source: { material_id: 'MAT-001', lot_id: 'LOT-001', quantity: 500, status: 'Accepted', expiration_date: '2027-01-01' } },
                { _source: { material_id: 'MAT-002', lot_id: 'LOT-002', quantity: 700, status: 'Accepted', expiration_date: '2026-12-01' } },
                { _source: { material_id: 'MAT-003', lot_id: 'LOT-003', quantity: 300, status: 'Accepted', expiration_date: '2026-06-01' } },
              ],
            },
          },
        },
        {
          key: 'Quarantine',
          doc_count: 1,
          total_quantity: { value: 200 },
          sample_lots: {
            hits: {
              hits: [
                { _source: { material_id: 'MAT-004', lot_id: 'LOT-004', quantity: 200, status: 'Quarantine', expiration_date: '' } },
              ],
            },
          },
        },
      ],
    },
  },
};

const materialUsageEsResponse = {
  aggregations: {
    by_material: {
      buckets: [
        { key: 'MAT-001', doc_count: 10, total_quantity: { value: 1000 } },
        { key: 'MAT-002', doc_count: 5, total_quantity: { value: 500 } },
      ],
    },
  },
};

const qcPerformanceEsResponse = {
  aggregations: {
    by_supplier: {
      buckets: [
        {
          key: 'ABC Corp',
          doc_count: 10,
          by_result: {
            buckets: [
              { key: 'Pass', doc_count: 9 },
              { key: 'Fail', doc_count: 1 },
            ],
          },
        },
        {
          key: 'XYZ Ltd',
          doc_count: 4,
          by_result: {
            buckets: [
              { key: 'Accepted', doc_count: 3 },
              { key: 'Rejected', doc_count: 1 },
            ],
          },
        },
      ],
    },
  },
};

const auditReportEsResponse = {
  hits: {
    hits: [
      {
        _source: {
          action: 'UPDATE',
          entity: 'InventoryLot',
          performed_by: 'operator1',
          performed_at: '2026-04-01T10:00:00Z',
          modified_date: '2026-04-01T10:00:00Z',
        },
      },
      {
        _source: {
          action: 'CREATE',
          entity: 'Material',
          performed_by: 'manager1',
          performed_at: '2026-04-02T09:00:00Z',
          modified_date: '2026-04-02T09:00:00Z',
        },
      },
    ],
  },
};

describe('ReportsRepository + ReportsService (integration)', () => {
  let service: ReportsService;
  let repository: ReportsRepository;
  let mockEsClient: { search: jest.Mock };

  beforeEach(async () => {
    mockEsClient = { search: jest.fn() };

    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        ReportsRepository,
        { provide: ELASTICSEARCH_CLIENT, useValue: mockEsClient },
      ],
    }).compile();

    service = testModule.get<ReportsService>(ReportsService);
    repository = testModule.get<ReportsRepository>(ReportsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ── getInventoryStatus ──────────────────────────────────────────────────

  describe('getInventoryStatusReport', () => {
    beforeEach(() => {
      mockEsClient.search.mockResolvedValue(inventoryStatusEsResponse);
    });

    it('queries inventory_lots_* wildcard index', async () => {
      await service.getInventoryStatusReport();

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'inventory_lots_*' }),
      );
    });

    it('returns generated_at as Date', async () => {
      const result = await service.getInventoryStatusReport();

      expect(result.generated_at).toBeInstanceOf(Date);
    });

    it('total_lots counts all items across all status buckets', async () => {
      const result = await service.getInventoryStatusReport();

      // 3 Accepted + 1 Quarantine = 4 items total
      expect(result.total_lots).toBe(4);
    });

    it('items contain material_id, lot_id, quantity, status from ES hits', async () => {
      const result = await service.getInventoryStatusReport();

      expect(result.items.length).toBeGreaterThan(0);
      const first = result.items[0];
      expect(first).toHaveProperty('material_id');
      expect(first).toHaveProperty('lot_id');
      expect(first).toHaveProperty('quantity');
      expect(first).toHaveProperty('status');
    });

    it('handles empty buckets gracefully (returns empty items)', async () => {
      mockEsClient.search.mockResolvedValue({ aggregations: { by_status: { buckets: [] } } });

      const result = await service.getInventoryStatusReport();

      expect(result.items).toEqual([]);
      expect(result.total_lots).toBe(0);
    });
  });

  // ── getMaterialUsage ────────────────────────────────────────────────────

  describe('getMaterialUsageReport', () => {
    beforeEach(() => {
      mockEsClient.search.mockResolvedValue(materialUsageEsResponse);
    });

    it('queries inventory_transactions_* wildcard index', async () => {
      await service.getMaterialUsageReport('2026-01-01', '2026-04-01');

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'inventory_transactions_*' }),
      );
    });

    it('adds range filter when from and to provided', async () => {
      await service.getMaterialUsageReport('2026-01-01', '2026-04-01');

      const searchArg = mockEsClient.search.mock.calls[0][0];
      expect(JSON.stringify(searchArg.query)).toContain('range');
    });

    it('uses match_all when no date range provided', async () => {
      await service.getMaterialUsageReport();

      const searchArg = mockEsClient.search.mock.calls[0][0];
      expect(JSON.stringify(searchArg.query)).toContain('match_all');
    });

    it('maps buckets to MaterialUsageItemDto: material_id, transaction_count, total_quantity', async () => {
      const result = await service.getMaterialUsageReport();

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          material_id: 'MAT-001',
          transaction_count: 10,
          total_quantity: 1000,
        }),
      );
    });

    it('stores from and to dates in response', async () => {
      const result = await service.getMaterialUsageReport('2026-01-01', '2026-04-01');

      expect(result.from).toBeInstanceOf(Date);
      expect(result.to).toBeInstanceOf(Date);
    });
  });

  // ── getQcPerformance ────────────────────────────────────────────────────

  describe('getQcPerformanceReport', () => {
    beforeEach(() => {
      mockEsClient.search.mockResolvedValue(qcPerformanceEsResponse);
    });

    it('queries qc_tests_* wildcard index', async () => {
      await service.getQcPerformanceReport();

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'qc_tests_*' }),
      );
    });

    it('calculates quality_rate correctly: approved/(approved+rejected)*100', async () => {
      const result = await service.getQcPerformanceReport();

      const abcCorp = result.items.find((i) => i.supplier_name === 'ABC Corp');
      expect(abcCorp?.quality_rate).toBe(90); // 9/10 * 100
    });

    it('handles Accepted/Rejected labels same as Pass/Fail', async () => {
      const result = await service.getQcPerformanceReport();

      const xyzLtd = result.items.find((i) => i.supplier_name === 'XYZ Ltd');
      expect(xyzLtd?.quality_rate).toBe(75); // 3/4 * 100
    });

    it('quality_rate is 0 when no QC results', async () => {
      mockEsClient.search.mockResolvedValue({
        aggregations: {
          by_supplier: {
            buckets: [
              { key: 'Empty Corp', doc_count: 0, by_result: { buckets: [] } },
            ],
          },
        },
      });

      const result = await service.getQcPerformanceReport();

      expect(result.items[0].quality_rate).toBe(0);
    });
  });

  // ── getAuditReport ──────────────────────────────────────────────────────

  describe('getAuditReport', () => {
    beforeEach(() => {
      mockEsClient.search.mockResolvedValue(auditReportEsResponse);
    });

    it('queries inventory_audit_reports_* with pagination', async () => {
      await service.getAuditReport(2, 50);

      const searchArg = mockEsClient.search.mock.calls[0][0];
      expect(searchArg.index).toBe('inventory_audit_reports_*');
      expect(searchArg.from).toBe(100); // page=2, size=50 → skip=100
      expect(searchArg.size).toBe(50);
    });

    it('defaults to page=0, size=20 when not provided', async () => {
      await service.getAuditReport();

      const searchArg = mockEsClient.search.mock.calls[0][0];
      expect(searchArg.from).toBe(0);
      expect(searchArg.size).toBe(20);
    });

    it('maps ES hits to AuditEntryDto: action, entity, performed_by, performed_at', async () => {
      const result = await service.getAuditReport();

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toEqual(
        expect.objectContaining({
          action: 'UPDATE',
          entity: 'InventoryLot',
          performed_by: 'operator1',
        }),
      );
      expect(result.entries[0].performed_at).toBeInstanceOf(Date);
    });

    it('returns generated_at as a Date', async () => {
      const result = await service.getAuditReport();

      expect(result.generated_at).toBeInstanceOf(Date);
    });
  });
});
