import { BaseCollectionSync, SyncResult } from './base-collection-sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { Model } from 'mongoose';

// Concrete subclass to test the abstract base
class TestCollectionSync extends BaseCollectionSync {
  readonly collectionName = 'test_collection';
  readonly model: Model<any>;

  constructor(
    model: Model<any>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    super(indexNaming, esBulk);
    this.model = model;
  }
}

const makeDoc = (overrides: Record<string, any> = {}) => ({
  _id: { toString: () => 'doc-id-1' },
  modified_date: new Date('2026-04-01T10:00:00Z'),
  created_date: new Date('2026-03-01T00:00:00Z'),
  ...overrides,
});

describe('BaseCollectionSync.sync()', () => {
  let syncer: TestCollectionSync;
  let mockModel: any;
  let mockIndexNaming: jest.Mocked<IndexNamingService>;
  let mockEsBulk: jest.Mocked<ElasticsearchBulkService>;

  const TO = new Date('2026-04-15T00:00:00Z');
  const FROM = new Date('2026-04-01T00:00:00Z');

  beforeEach(() => {
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    mockModel = {
      find: jest.fn().mockReturnValue(mockQuery),
      _mockQuery: mockQuery,
    };

    mockIndexNaming = {
      getIndexName: jest.fn().mockReturnValue('test_collection-2026-04'),
    } as any;

    mockEsBulk = {
      bulkIndex: jest.fn().mockResolvedValue({ indexed: 0, errors: 0 }),
      bulkDelete: jest.fn().mockResolvedValue({ deleted: 0, errors: 0 }),
    } as any;

    syncer = new TestCollectionSync(mockModel, mockIndexNaming, mockEsBulk);
  });

  it('returns zero counts when no documents match the window', async () => {
    const result: SyncResult = await syncer.sync(FROM, TO, 500);

    expect(result.collection).toBe('test_collection');
    expect(result.indexed).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('passes incremental query (from + to) when from is provided', async () => {
    await syncer.sync(FROM, TO, 500);

    expect(mockModel.find).toHaveBeenCalledWith({
      modified_date: { $gt: FROM, $lte: TO },
    });
  });

  it('passes full-history query ($lte only) when from is null', async () => {
    await syncer.sync(null, TO, 500);

    expect(mockModel.find).toHaveBeenCalledWith({
      modified_date: { $lte: TO },
    });
  });

  it('indexes live documents via bulkIndex', async () => {
    const doc = makeDoc();
    mockModel._mockQuery.exec
      .mockResolvedValueOnce([doc])
      .mockResolvedValueOnce([]);

    mockEsBulk.bulkIndex.mockResolvedValue({ indexed: 1, deleted: 0, errors: 0 });

    const result = await syncer.sync(FROM, TO, 500);

    expect(mockEsBulk.bulkIndex).toHaveBeenCalledWith(
      'test_collection-2026-04',
      [doc],
      { collectionName: 'test_collection' },
    );
    expect(result.indexed).toBe(1);
    expect(result.deleted).toBe(0);
  });

  it('routes soft-deleted (deleted: true) docs to bulkDelete', async () => {
    const doc = makeDoc({ deleted: true });
    mockModel._mockQuery.exec
      .mockResolvedValueOnce([doc])
      .mockResolvedValueOnce([]);

    mockEsBulk.bulkDelete.mockResolvedValue({ indexed: 0, deleted: 1, errors: 0 });

    const result = await syncer.sync(FROM, TO, 500);

    expect(mockEsBulk.bulkDelete).toHaveBeenCalledWith(
      'test_collection-2026-04',
      ['doc-id-1'],
    );
    expect(result.deleted).toBe(1);
    expect(result.indexed).toBe(0);
    expect(mockEsBulk.bulkIndex).not.toHaveBeenCalled();
  });

  it('routes soft-deleted (is_active: false) docs to bulkDelete', async () => {
    const doc = makeDoc({ is_active: false });
    mockModel._mockQuery.exec
      .mockResolvedValueOnce([doc])
      .mockResolvedValueOnce([]);

    mockEsBulk.bulkDelete.mockResolvedValue({ indexed: 0, deleted: 1, errors: 0 });

    const result = await syncer.sync(FROM, TO, 500);

    expect(result.deleted).toBe(1);
  });

  it('accumulates errors from bulkIndex', async () => {
    const doc = makeDoc();
    mockModel._mockQuery.exec
      .mockResolvedValueOnce([doc])
      .mockResolvedValueOnce([]);

    mockEsBulk.bulkIndex.mockResolvedValue({ indexed: 0, deleted: 0, errors: 2 });

    const result = await syncer.sync(FROM, TO, 500);

    expect(result.errors).toBe(2);
    expect(result.indexed).toBe(0);
  });

  it('paginates: continues until batch returns fewer than batchSize', async () => {
    const batch1 = [makeDoc({ _id: { toString: () => 'id-1' } }), makeDoc({ _id: { toString: () => 'id-2' } })];
    const batch2 = [makeDoc({ _id: { toString: () => 'id-3' } })];

    mockModel._mockQuery.exec
      .mockResolvedValueOnce(batch1)
      .mockResolvedValueOnce(batch2)
      .mockResolvedValueOnce([]);

    mockEsBulk.bulkIndex
      .mockResolvedValueOnce({ indexed: 2, deleted: 0, errors: 0 })
      .mockResolvedValueOnce({ indexed: 1, deleted: 0, errors: 0 });

    const result = await syncer.sync(FROM, TO, 2);

    expect(mockEsBulk.bulkIndex).toHaveBeenCalledTimes(2);
    expect(result.indexed).toBe(3);
  });

  it('groups documents into separate monthly index buckets', async () => {
    const docApril = makeDoc({ modified_date: new Date('2026-04-10') });
    const docMay = makeDoc({
      _id: { toString: () => 'id-2' },
      modified_date: new Date('2026-05-10'),
    });

    mockIndexNaming.getIndexName
      .mockReturnValueOnce('test_collection-2026-04')
      .mockReturnValueOnce('test_collection-2026-05');

    mockModel._mockQuery.exec
      .mockResolvedValueOnce([docApril, docMay])
      .mockResolvedValueOnce([]);

    mockEsBulk.bulkIndex.mockResolvedValue({ indexed: 1, deleted: 0, errors: 0 });

    const result = await syncer.sync(FROM, TO, 500);

    expect(mockEsBulk.bulkIndex).toHaveBeenCalledTimes(2);
    expect(result.indexed).toBe(2);
  });
});
