import { PHASE1_ACL_RULES } from './rag-phase1.rules';
import { Phase1SourceCollection, RetrievedDocument } from './retrieved-document.types';

type GenericMongoDoc = Record<string, unknown>;

export interface MarkdownChunkInput {
  path: string;
  chunkText: string;
  chunkIndex: number;
  sectionTitle?: string;
  updatedAt?: string | Date | number;
  aclTags?: string[];
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof (value as { toString?: () => string }).toString === 'function') {
    return (value as { toString: () => string }).toString();
  }
  return '';
}

function toDateOrNow(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

function toIsoDateString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

interface BuildDocumentInput {
  sourceType: 'mongo' | 'markdown';
  sourceId: string;
  content: string;
  metadata: Record<string, unknown>;
  updatedAt?: unknown;
  collection: Phase1SourceCollection;
  aclTags?: string[];
  embedding?: number[] | null;
}

function buildRetrievedDocument(input: BuildDocumentInput): RetrievedDocument {
  return {
    id: `${input.collection}:${input.sourceId}`,
    source_type: input.sourceType,
    source_id: input.sourceId,
    source_collection: input.collection,
    content: input.content.trim(),
    metadata: input.metadata,
    embedding: input.embedding ?? null,
    updated_at: toDateOrNow(input.updatedAt),
    acl_tags: input.aclTags ?? PHASE1_ACL_RULES[input.collection],
  };
}

function fallbackId(doc: GenericMongoDoc): string {
  return asString(doc._id) || 'unknown';
}

export function mapInventoryLotToRetrievedDocument(doc: GenericMongoDoc): RetrievedDocument {
  const lotId = asString(doc.lot_id) || fallbackId(doc);
  const materialId = asString(doc.material_id);
  const status = asString(doc.status);
  const quantity = asString(doc.quantity);
  const unit = asString(doc.unit_of_measure);
  const expirationDate = toIsoDateString(doc.expiration_date);
  const inUseExpirationDate = toIsoDateString(doc.in_use_expiration_date);

  const content = [
    `Lot ID: ${lotId}`,
    materialId ? `Material ID: ${materialId}` : '',
    status ? `Status: ${status}` : '',
    quantity ? `Quantity: ${quantity}${unit ? ` ${unit}` : ''}` : '',
    expirationDate ? `Expiration Date: ${expirationDate}` : '',
    expirationDate ? `Han dung (het han): ${expirationDate}` : '',
    inUseExpirationDate
      ? `In-use Expiration Date: ${inUseExpirationDate}`
      : '',
  ]
    .filter(Boolean)
    .join(' | ');

  return buildRetrievedDocument({
    sourceType: 'mongo',
    sourceId: lotId,
    collection: 'inventory_lots',
    content,
    updatedAt: doc.modified_date ?? doc.created_date,
    metadata: {
      lot_id: lotId,
      material_id: materialId || null,
      status: status || null,
      quantity: quantity ? Number(quantity) : null,
      unit_of_measure: unit || null,
      expiration_date: expirationDate,
      in_use_expiration_date: inUseExpirationDate,
    },
  });
}

export function mapQCTestToRetrievedDocument(doc: GenericMongoDoc): RetrievedDocument {
  const testId = asString(doc.test_id) || fallbackId(doc);
  const lotId = asString(doc.lot_id);
  const testType = asString(doc.test_type);
  const resultStatus = asString(doc.result_status);

  const content = [
    `QC Test ID: ${testId}`,
    lotId ? `Lot ID: ${lotId}` : '',
    testType ? `Test Type: ${testType}` : '',
    resultStatus ? `Result Status: ${resultStatus}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  return buildRetrievedDocument({
    sourceType: 'mongo',
    sourceId: testId,
    collection: 'qc_tests',
    content,
    updatedAt: doc.modified_date ?? doc.created_date,
    metadata: {
      test_id: testId,
      lot_id: lotId || null,
      test_type: testType || null,
      result_status: resultStatus || null,
      test_date: asString(doc.test_date) || null,
    },
  });
}

export function mapInventoryTransactionToRetrievedDocument(doc: GenericMongoDoc): RetrievedDocument {
  const transactionId = asString(doc.transaction_id) || fallbackId(doc);
  const lotId = asString(doc.lot_id);
  const transactionType = asString(doc.transaction_type);
  const quantity = asString(doc.quantity);
  const unit = asString(doc.unit_of_measure);

  const content = [
    `Transaction ID: ${transactionId}`,
    lotId ? `Lot ID: ${lotId}` : '',
    transactionType ? `Type: ${transactionType}` : '',
    quantity ? `Quantity: ${quantity}${unit ? ` ${unit}` : ''}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  return buildRetrievedDocument({
    sourceType: 'mongo',
    sourceId: transactionId,
    collection: 'inventory_transactions',
    content,
    updatedAt: doc.modified_date ?? doc.created_date,
    metadata: {
      transaction_id: transactionId,
      lot_id: lotId || null,
      transaction_type: transactionType || null,
      quantity: quantity ? Number(quantity) : null,
      unit_of_measure: unit || null,
      performed_by: asString(doc.performed_by) || null,
      transaction_date: asString(doc.transaction_date) || null,
    },
  });
}

export function mapMarkdownChunkToRetrievedDocument(input: MarkdownChunkInput): RetrievedDocument {
  const sourceId = `${input.path}#${input.chunkIndex}`;

  const content = [
    input.sectionTitle ? `Section: ${input.sectionTitle}` : '',
    input.chunkText,
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  return buildRetrievedDocument({
    sourceType: 'markdown',
    sourceId,
    collection: 'docs_knowledge',
    content,
    updatedAt: input.updatedAt,
    aclTags: input.aclTags,
    metadata: {
      path: input.path,
      chunk_index: input.chunkIndex,
      section_title: input.sectionTitle ?? null,
    },
  });
}
