/**
 * File: rag/rag-phase1.rules.ts
 * Mục đích: Định nghĩa các quy tắc (rules) cho hệ thống RAG Phase 1
 * 
 * File này chứa 3 loại quy tắc chính:
 * 1. PHASE1_ALLOWED_MONGO_COLLECTIONS: Danh sách collection MongoDB được hỗ trợ
 * 2. PHASE1_CHUNKING_RULES: Quy tắc chia nhỏ (chunk) tài liệu cho từng loại
 * 3. PHASE1_ACL_RULES: Quy tắc phân quyền truy cập (Access Control List)
 * 
 * Các quy tắc này được dùng bởi:
 * - rag-phase1.mapper.ts: Để tạo ACL tags khi map tài liệu
 * - markdown-knowledge.sync.ts: Để chia nhỏ file Markdown thành chunks
 */
import {
  PHASE1_SOURCE_COLLECTIONS,
  Phase1SourceCollection,
} from './retrieved-document.types';

/** Danh sách collection MongoDB được phép sử dụng trong RAG Phase 1 */
export const PHASE1_ALLOWED_MONGO_COLLECTIONS: ReadonlyArray<Phase1SourceCollection> = [
  'inventory_lots',
  'qc_tests',
  'inventory_transactions',
];

/** Thư mục gốc chứa tài liệu Markdown cho RAG */
export const PHASE1_MARKDOWN_ROOT = '01_Documents';

/**
 * Cấu hình quy tắc chia nhỏ (chunking) cho từng loại tài liệu
 * 
 * @property mode - Chế độ chunking:
 *   - 'document': Toàn bộ document là một chunk (cho Mongo docs)
 *   - 'markdown_heading': Chia theo heading (cho Markdown)
 * @property maxChars - Số ký tự tối đa mỗi chunk
 * @property overlapChars - Số ký tự overlap giữa các chunk liên tiếp
 *   (giúp duy trì ngữ cảnh khi tìm kiếm)
 */
export interface ChunkingRule {
  mode: 'document' | 'markdown_heading';
  maxChars: number;
  overlapChars: number;
}

/**
 * Bảng quy tắc chunking cho từng collection nguồn
 * 
 * - Mongo docs (inventory_lots, qc_tests, inventory_transactions):
 *   Mode 'document', không overlap (vì mỗi doc đã ngắn)
 * 
 * - Markdown (docs_knowledge):
 *   Mode 'markdown_heading', có overlap 120 chars (để duy trì ngữ cảnh)
 */
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

/**
 * Bảng quy tắc phân quyền (ACL) cho từng collection
 * 
 * Mỗi tag có format 'role:<tên_role>' xác định role nào được phép
 * truy cập dữ liệu của collection đó.
 * 
 * Ví dụ: qc_tests chỉ có manager, quality-control, it_admin
 * (operator không xem được kết quả QC)
 */
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

/**
 * Kiểm tra xem một tên collection có thuộc danh sách Phase 1 không
 * @param value - Tên collection cần kiểm tra
 * @returns true nếu là Phase 1 source collection
 * 
 * Sử dụng type guard để TypeScript thu hẹp kiểu
 */
export function isPhase1SourceCollection(value: string): value is Phase1SourceCollection {
  return PHASE1_SOURCE_COLLECTIONS.includes(value as Phase1SourceCollection);
}
