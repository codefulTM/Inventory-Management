import {
  mapInventoryLotToRetrievedDocument,
  mapInventoryTransactionToRetrievedDocument,
  mapMarkdownChunkToRetrievedDocument,
  mapQCTestToRetrievedDocument,
} from './rag-phase1.mapper';
import {
  isPhase1SourceCollection,
  PHASE1_ACL_RULES,
  PHASE1_ALLOWED_MONGO_COLLECTIONS,
  PHASE1_CHUNKING_RULES,
  PHASE1_MARKDOWN_ROOT,
} from './rag-phase1.rules';

describe('Phase 1 RAG scope and schema', () => {
  it('keeps phase 1 scope locked to 3 Mongo collections', () => {
    expect(PHASE1_ALLOWED_MONGO_COLLECTIONS).toEqual([
      'inventory_lots',
      'qc_tests',
      'inventory_transactions',
    ]);
    expect(PHASE1_MARKDOWN_ROOT).toBe('01_Documents');
  });

  it('defines markdown chunking with overlap and document chunking without overlap', () => {
    expect(PHASE1_CHUNKING_RULES.docs_knowledge.mode).toBe('markdown_heading');
    expect(PHASE1_CHUNKING_RULES.docs_knowledge.overlapChars).toBeGreaterThan(0);
    expect(PHASE1_CHUNKING_RULES.inventory_lots.mode).toBe('document');
    expect(PHASE1_CHUNKING_RULES.inventory_lots.overlapChars).toBe(0);
  });

  it('maps inventory lot Mongo document to RetrievedDocument', () => {
    const output = mapInventoryLotToRetrievedDocument({
      _id: 'mongo-lot-id',
      lot_id: 'LOT-001',
      material_id: 'MAT-11',
      status: 'active',
      quantity: 100,
      unit_of_measure: 'kg',
      expiration_date: '2026-05-20T00:00:00.000Z',
      in_use_expiration_date: '2026-05-10T00:00:00.000Z',
      modified_date: '2026-04-20T10:00:00.000Z',
    });

    expect(output.source_collection).toBe('inventory_lots');
    expect(output.source_type).toBe('mongo');
    expect(output.source_id).toBe('LOT-001');
    expect(output.acl_tags).toEqual(PHASE1_ACL_RULES.inventory_lots);
    expect(output.content).toContain('Lot ID: LOT-001');
    expect(output.content).toContain('Expiration Date: 2026-05-20T00:00:00.000Z');
    expect(output.content).toContain('Han dung (het han): 2026-05-20T00:00:00.000Z');
    expect(output.metadata).toMatchObject({
      expiration_date: '2026-05-20T00:00:00.000Z',
      in_use_expiration_date: '2026-05-10T00:00:00.000Z',
    });
    expect(output.embedding).toBeNull();
  });

  it('maps QC test and transaction docs with correct collections', () => {
    const qc = mapQCTestToRetrievedDocument({
      _id: 'mongo-qc-id',
      test_id: 'QC-007',
      result_status: 'passed',
    });

    const tx = mapInventoryTransactionToRetrievedDocument({
      _id: 'mongo-tx-id',
      transaction_id: 'TX-009',
      transaction_type: 'OUT',
      quantity: 5,
    });

    expect(qc.source_collection).toBe('qc_tests');
    expect(qc.source_type).toBe('mongo');
    expect(tx.source_collection).toBe('inventory_transactions');
    expect(tx.source_type).toBe('mongo');
    expect(qc.id).toBe('qc_tests:QC-007');
    expect(tx.id).toBe('inventory_transactions:TX-009');
  });

  it('maps markdown chunks to docs_knowledge with section metadata', () => {
    const output = mapMarkdownChunkToRetrievedDocument({
      path: '01_Documents/05_Architecture.md',
      chunkIndex: 2,
      sectionTitle: 'Event-Driven Inventory',
      chunkText: 'Kafka emits inventory mutation events for analytics sync.',
    });

    expect(output.source_collection).toBe('docs_knowledge');
    expect(output.source_type).toBe('markdown');
    expect(output.source_id).toBe('01_Documents/05_Architecture.md#2');
    expect(output.content).toContain('Section: Event-Driven Inventory');
    expect(output.metadata).toMatchObject({
      path: '01_Documents/05_Architecture.md',
      chunk_index: 2,
      section_title: 'Event-Driven Inventory',
    });
  });

  it('validates allowed phase 1 collection names', () => {
    expect(isPhase1SourceCollection('inventory_lots')).toBe(true);
    expect(isPhase1SourceCollection('docs_knowledge')).toBe(true);
    expect(isPhase1SourceCollection('materials')).toBe(false);
  });
});
