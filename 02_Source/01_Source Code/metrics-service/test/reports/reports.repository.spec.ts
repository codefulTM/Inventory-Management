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
            { key: 'MAT-02', doc_count: 3, total_quantity: { value: 150 } },
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

  // ─── Trend Reports ────────────────────────────────────────────────────────

  it('getInventoryTrend — maps period buckets into trend points', async () => {
    mockEsSearch.mockResolvedValue({
      aggregations: {
        by_period: {
          buckets: [
            {
              key_as_string: '2026-04-01',
              doc_count: 12,
              total_quantity: { value: 1440 },
            },
          ],
        },
      },
    });

    const points = await repo.getInventoryTrend(
      new Date('2026-04-01T00:00:00Z'),
      new Date('2026-04-30T23:59:59Z'),
      'day',
    );

    expect(points).toEqual([
      {
        period: '2026-04-01',
        lot_count: 12,
        total_quantity: 1440,
      },
    ]);
  });

  it('getMaterialUsageTrend — flattens period/material buckets', async () => {
    mockEsSearch.mockResolvedValue({
      aggregations: {
        by_period: {
          buckets: [
            {
              key_as_string: '2026-04-01',
              by_material: {
                buckets: [
                  {
                    key: 'MAT-01',
                    doc_count: 5,
                    total_quantity: { value: 250 },
                  },
                ],
              },
            },
          ],
        },
      },
    });

    const points = await repo.getMaterialUsageTrend(
      new Date('2026-04-01T00:00:00Z'),
      new Date('2026-04-30T23:59:59Z'),
      'day',
      5,
    );

    expect(points).toEqual([
      {
        period: '2026-04-01',
        material_id: 'MAT-01',
        transaction_count: 5,
        total_quantity: 250,
      },
    ]);
  });

  it('getQcTrend — returns trend points and supplier ranking', async () => {
    mockEsSearch.mockResolvedValue({
      aggregations: {
        by_period: {
          buckets: [
            {
              key_as_string: '2026-04-01',
              pass_count: { doc_count: 9 },
              fail_count: { doc_count: 1 },
              pending_count: { doc_count: 2 },
            },
          ],
        },
        by_supplier: {
          buckets: [
            {
              key: 'Supplier A',
              pass_count: { doc_count: 9 },
              fail_count: { doc_count: 1 },
            },
          ],
        },
      },
    });

    const result = await repo.getQcTrend(
      new Date('2026-04-01T00:00:00Z'),
      new Date('2026-04-30T23:59:59Z'),
      'day',
      5,
    );

    expect(result.points).toEqual([
      {
        period: '2026-04-01',
        pass_count: 9,
        fail_count: 1,
        pending_count: 2,
      },
    ]);
    expect(result.supplier_rankings[0].supplier_name).toBe('Supplier A');
    expect(result.supplier_rankings[0].quality_rate).toBe(90);
  });

  it('getAuditTrend — maps activity and unique user counts', async () => {
    mockEsSearch.mockResolvedValue({
      aggregations: {
        by_period: {
          buckets: [
            {
              key_as_string: '2026-04-01',
              doc_count: 15,
              unique_users: { value: 4 },
            },
          ],
        },
      },
    });

    const points = await repo.getAuditTrend(
      new Date('2026-04-01T00:00:00Z'),
      new Date('2026-04-30T23:59:59Z'),
      'day',
    );

    expect(points).toEqual([
      {
        period: '2026-04-01',
        activity_count: 15,
        unique_users: 4,
      },
    ]);
  });
});
