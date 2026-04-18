import { ReportsRepository } from '../../src/reports/repositories/reports.repository';

const mockEsSearch = jest.fn();
const mockEs = { search: mockEsSearch };

describe('ReportsRepository (ES queries)', () => {
  let repo: ReportsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new ReportsRepository(mockEs as any);
  });

  // ─── getInventoryStatus ────────────────────────────────────────────────────

  it('getInventoryStatus — extracts items from ES top_hits buckets', async () => {
    mockEsSearch.mockResolvedValue({
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
                        quantity: 50,
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

    const items = await repo.getInventoryStatus();

    expect(mockEsSearch).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'inventory_lots_*' }),
    );
    expect(items).toHaveLength(1);
    expect(items[0].lot_id).toBe('LOT-01');
    expect(items[0].expiration_date).toBeInstanceOf(Date);
  });

  it('getInventoryStatus — returns empty array when no buckets', async () => {
    mockEsSearch.mockResolvedValue({ aggregations: { by_status: { buckets: [] } } });
    const items = await repo.getInventoryStatus();
    expect(items).toEqual([]);
  });

  // ─── getMaterialUsage ──────────────────────────────────────────────────────

  it('getMaterialUsage — applies date range filter when from/to provided', async () => {
    mockEsSearch.mockResolvedValue({
      aggregations: {
        by_material: {
          buckets: [
            { key: 'MAT-02', transaction_count: { value: 3 }, total_quantity: { value: 150 } },
          ],
        },
      },
    });

    const from = new Date('2026-01-01');
    const to = new Date('2026-03-31');
    const items = await repo.getMaterialUsage(from, to);

    const callArg = mockEsSearch.mock.calls[0][0];
    expect(callArg.query.bool.must[0].range.transaction_date.gte).toBe(from.toISOString());
    expect(callArg.query.bool.must[0].range.transaction_date.lte).toBe(to.toISOString());
    expect(items[0].material_id).toBe('MAT-02');
    expect(items[0].transaction_count).toBe(3);
    expect(items[0].total_quantity).toBe(150);
  });

  it('getMaterialUsage — uses match_all when no date range', async () => {
    mockEsSearch.mockResolvedValue({ aggregations: { by_material: { buckets: [] } } });

    await repo.getMaterialUsage();

    const callArg = mockEsSearch.mock.calls[0][0];
    expect(callArg.query).toEqual({ match_all: {} });
  });

  // ─── getQcPerformance ──────────────────────────────────────────────────────

  it('getQcPerformance — computes quality_rate correctly', async () => {
    mockEsSearch.mockResolvedValue({
      aggregations: {
        by_supplier: {
          buckets: [
            {
              key: 'Supplier A',
              by_result: {
                buckets: [
                  { key: 'Pass', doc_count: 8 },
                  { key: 'Fail', doc_count: 2 },
                ],
              },
            },
          ],
        },
      },
    });

    const items = await repo.getQcPerformance();

    expect(items[0].supplier_name).toBe('Supplier A');
    expect(items[0].approved).toBe(8);
    expect(items[0].rejected).toBe(2);
    expect(items[0].quality_rate).toBe(80);
  });

  it('getQcPerformance — quality_rate is 0 when no results', async () => {
    mockEsSearch.mockResolvedValue({
      aggregations: {
        by_supplier: {
          buckets: [{ key: 'Supplier B', by_result: { buckets: [] } }],
        },
      },
    });

    const items = await repo.getQcPerformance();
    expect(items[0].quality_rate).toBe(0);
  });

  // ─── getAuditTrail ─────────────────────────────────────────────────────────

  it('getAuditTrail — maps ES hits to AuditEntryDto', async () => {
    mockEsSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              action: 'CREATE',
              entity: 'InventoryLot',
              performed_by: 'user-01',
              performed_at: '2026-04-01T10:00:00Z',
              details: { reason: 'manual entry' },
            },
          },
        ],
      },
    });

    const entries = await repo.getAuditTrail(0, 20);

    expect(mockEsSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'inventory_audit_reports_*',
        from: 0,
        size: 20,
      }),
    );
    expect(entries[0].action).toBe('CREATE');
    expect(entries[0].performed_at).toBeInstanceOf(Date);
  });

  it('getAuditTrail — returns empty array when no hits', async () => {
    mockEsSearch.mockResolvedValue({ hits: { hits: [] } });
    const entries = await repo.getAuditTrail();
    expect(entries).toEqual([]);
  });
});
