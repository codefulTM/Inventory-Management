/**
 * File: rag/retrieved-document.types.ts
 * Mục đích: Định nghĩa kiểu dữ liệu và hằng số cho hệ thống RAG (Retrieval-Augmented Generation)
 * 
 * RetrievedDocument là cấu trúc chuẩn hóa cho tất cả tài liệu được index vào Elasticsearch
 * để phục vụ tìm kiếm ngữ nghĩa (semantic search). Bất kể tài liệu đến từ MongoDB
 * hay file Markdown, đều được chuyển đổi sang cấu trúc này trước khi tạo embedding.
 * 
 * PHASE1_SCOPE_VERSION: Đánh dấu phiên bản scope hiện tại (MVP)
 * PHASE1_SOURCE_COLLECTIONS: Danh sách các collection được hỗ trợ trong Phase 1
 */

/** Phiên bản scope của Phase 1 (MVP) */
export const PHASE1_SCOPE_VERSION = 'phase1-mvp';

/** Danh sách các collection nguồn được hỗ trợ tìm kiếm ngữ nghĩa trong Phase 1 */
export const PHASE1_SOURCE_COLLECTIONS = [
  'inventory_lots',          // Lô hàng tồn kho
  'qc_tests',                // Kết quả kiểm tra chất lượng
  'inventory_transactions',  // Giao dịch kho
  'docs_knowledge',          // Tài liệu kiến thức (Markdown)
] as const;

/** Type helper: lấy kiểu union từ mảng const */
export type Phase1SourceCollection = (typeof PHASE1_SOURCE_COLLECTIONS)[number];

/** Nguồn gốc của tài liệu: mongo (từ MongoDB) hoặc markdown (từ file system) */
export type RetrievalSourceType = 'mongo' | 'markdown';

/**
 * Cấu trúc chuẩn hóa cho tài liệu RAG
 * 
 * Đây là interface trung tâm, mọi tài liệu (từ MongoDB hay Markdown)
 * đều được map sang cấu trúc này trước khi index vào Elasticsearch.
 * 
 * @property id - Định danh duy nhất, format: {collection}:{sourceId}
 * @property source_type - Nguồn gốc: 'mongo' hoặc 'markdown'
 * @property source_id - ID gốc của tài liệu nguồn
 * @property source_collection - Tên collection nguồn (inventory_lots, qc_tests, etc.)
 * @property content - Nội dung văn bản đã tổng hợp để tìm kiếm (rag_text)
 * @property metadata - Thông tin chi tiết dạng structured
 * @property embedding - Vector embedding cho tìm kiếm ngữ nghĩa (null nếu chưa tạo)
 * @property updated_at - Thời gian cập nhật cuối cùng
 * @property acl_tags - Tags phân quyền truy cập (role:manager, role:operator, etc.)
 */
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
