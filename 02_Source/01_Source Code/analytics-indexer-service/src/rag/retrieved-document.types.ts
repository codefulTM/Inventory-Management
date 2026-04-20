export const PHASE1_SCOPE_VERSION = 'phase1-mvp';

export const PHASE1_SOURCE_COLLECTIONS = [
  'inventory_lots',
  'qc_tests',
  'inventory_transactions',
  'docs_knowledge',
] as const;

export type Phase1SourceCollection = (typeof PHASE1_SOURCE_COLLECTIONS)[number];

export type RetrievalSourceType = 'mongo' | 'markdown';

export interface RetrievedDocument {
  id: string;
  source_type: RetrievalSourceType;
  source_id: string;
  source_collection: Phase1SourceCollection;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[] | null;
  updated_at: Date;
  acl_tags: string[];
}
