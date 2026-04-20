import {
  PHASE1_SOURCE_COLLECTIONS,
  Phase1SourceCollection,
} from './retrieved-document.types';

export const PHASE1_ALLOWED_MONGO_COLLECTIONS: ReadonlyArray<Phase1SourceCollection> = [
  'inventory_lots',
  'qc_tests',
  'inventory_transactions',
];

export const PHASE1_MARKDOWN_ROOT = '01_Documents';

export interface ChunkingRule {
  mode: 'document' | 'markdown_heading';
  maxChars: number;
  overlapChars: number;
}

export const PHASE1_CHUNKING_RULES: Record<Phase1SourceCollection, ChunkingRule> = {
  inventory_lots: {
    mode: 'document',
    maxChars: 1400,
    overlapChars: 0,
  },
  qc_tests: {
    mode: 'document',
    maxChars: 1400,
    overlapChars: 0,
  },
  inventory_transactions: {
    mode: 'document',
    maxChars: 1400,
    overlapChars: 0,
  },
  docs_knowledge: {
    mode: 'markdown_heading',
    maxChars: 1200,
    overlapChars: 120,
  },
};

export const PHASE1_ACL_RULES: Record<Phase1SourceCollection, string[]> = {
  inventory_lots: [
    'role:manager',
    'role:operator',
    'role:quality-control',
    'role:it_admin',
  ],
  qc_tests: [
    'role:manager',
    'role:quality-control',
    'role:it_admin',
  ],
  inventory_transactions: [
    'role:manager',
    'role:operator',
    'role:it_admin',
  ],
  docs_knowledge: [
    'role:manager',
    'role:operator',
    'role:quality-control',
    'role:it_admin',
  ],
};

export function isPhase1SourceCollection(value: string): value is Phase1SourceCollection {
  return PHASE1_SOURCE_COLLECTIONS.includes(value as Phase1SourceCollection);
}
