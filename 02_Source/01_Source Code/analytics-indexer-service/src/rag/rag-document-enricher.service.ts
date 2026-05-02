/**
 * File: rag/rag-document-enricher.service.ts
 * Mục đích: Làm giàu tài liệu với thông tin RAG
 * 
 * Dịch vụ này chuyển đổi tài liệu từ MongoDB hoặc Markdown thành định dạng RAG:
 * - Tạo nội dung văn bản (rag_text) để tìm kiếm full-text
 * - Tạo embedding vector để tìm kiếm ngữ nghĩa
 * - Thêm metadata và ACL tags để phân quyền
 * 
 * Quy trình enrich một tài liệu:
 * 1. Map sang RetrievedDocument (chuẩn hóa cấu trúc)
 * 2. Tạo embedding từ rag_text thông qua EmbeddingService
 * 3. Thêm các trường RAG vào document gốc
 */
import { Injectable } from '@nestjs/common';
import {
  mapInventoryLotToRetrievedDocument,
  mapInventoryTransactionToRetrievedDocument,
  mapMarkdownChunkToRetrievedDocument,
  mapQCTestToRetrievedDocument,
  MarkdownChunkInput,
} from './rag-phase1.mapper';
import { RetrievedDocument } from './retrieved-document.types';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class RagDocumentEnricherService {
  constructor(
    // Service tạo embedding vector từ văn bản
    private readonly embeddingService: EmbeddingService
  ) {}

  /**
   * Làm giàu hàng loạt tài liệu từ MongoDB
   * @param collectionName - Tên collection (để chọn mapper phù hợp)
   * @param docs - Mảng tài liệu từ MongoDB
   * @returns Mảng tài liệu đã được enrich với thông tin RAG
   * 
   * Tự động chọn mapper dựa trên collectionName:
   * - inventory_lots -> mapInventoryLotToRetrievedDocument
   * - qc_tests -> mapQCTestToRetrievedDocument
   * - inventory_transactions -> mapInventoryTransactionToRetrievedDocument
   * - Không hỗ trợ -> trả về nguyên bản
   */
  async enrichMongoDocuments(
    collectionName: string,
    docs: Record<string, any>[],
  ): Promise<Record<string, any>[]> {
    if (!docs.length) return docs;

    if (collectionName === 'inventory_lots') {
      return this.enrichWithMapper(docs, mapInventoryLotToRetrievedDocument);
    }

    if (collectionName === 'qc_tests') {
      return this.enrichWithMapper(docs, mapQCTestToRetrievedDocument);
    }

    if (collectionName === 'inventory_transactions') {
      return this.enrichWithMapper(docs, mapInventoryTransactionToRetrievedDocument);
    }

    // Collection không hỗ trợ RAG -> trả về nguyên bản
    return docs;
  }

  /**
   * Làm giàu một chunk Markdown
   * @param input - Thông tin chunk (path, text, chunkIndex, etc.)
   * @returns Document đã enrich sẵn sàng để index vào ES
   * 
   * Khác với Mongo docs: Markdown không có sẵn trong MongoDB
   * Nên phải tạo mới toàn bộ document
   */
  async enrichMarkdownChunk(input: MarkdownChunkInput): Promise<Record<string, any>> {
    // Map chunk sang RetrievedDocument
    const retrieved = mapMarkdownChunkToRetrievedDocument(input);
    
    // Tạo embedding từ nội dung
    const embedding = await this.embeddingService.embedText(retrieved.content);

    // Trả về document đã enrich, sẵn sàng cho ES
    return {
      id: retrieved.id,
      path: input.path,
      chunk_index: input.chunkIndex,
      section_title: input.sectionTitle ?? null,
      created_date: retrieved.updated_at,
      modified_date: retrieved.updated_at,
      // Thêm các trường RAG
      ...this.toRagFields(retrieved, embedding),
    };
  }

  /**
   * Làm giàu hàng loạt docs với một mapper cụ thể
   * @param docs - Mảng tài liệu gốc
   * @param mapper - Hàm chuyển đổi sang RetrievedDocument
   * @returns Mảng tài liệu đã enrich
   * 
   * Xử lý từng doc một (sequential) để tạo embedding
   */
  private async enrichWithMapper(
    docs: Record<string, any>[],
    mapper: (doc: Record<string, any>) => RetrievedDocument,
  ): Promise<Record<string, any>[]> {
    const enriched: Record<string, any>[] = [];

    for (const doc of docs) {
      // Chuyển đổi sang RetrievedDocument
      const retrieved = mapper(doc);
      
      // Tạo embedding từ nội dung
      const embedding = await this.embeddingService.embedText(retrieved.content);

      // Merge thông tin gốc + thông tin RAG
      enriched.push({
        ...doc,  // Giữ nguyên các trường gốc
        ...this.toRagFields(retrieved, embedding),  // Thêm trường RAG
      });
    }

    return enriched;
  }

  /**
   * Chuyển đổi RetrievedDocument thành các trường RAG
   * @param retrieved - RetrievedDocument đã được map
   * @param embedding - Vector embedding (có thể null)
   * @returns Object chứa các trường RAG
   * 
   * Các trường RAG bao gồm:
   * - source_type, source_id, source_collection
   * - rag_text, rag_metadata, acl_tags
   * - updated_at, embedding
   */
  private toRagFields(retrieved: RetrievedDocument, embedding: number[] | null): Record<string, any> {
    const fields: Record<string, any> = {
      source_type: retrieved.source_type,
      source_id: retrieved.source_id,
      source_collection: retrieved.source_collection,
      rag_text: retrieved.content,           // Nội dung để tìm kiếm full-text
      rag_metadata: retrieved.metadata,       // Metadata bổ sung
      acl_tags: retrieved.acl_tags,           // Tags phân quyền
      updated_at: retrieved.updated_at,       // Thời gian cập nhật
    };

    // Chỉ thêm embedding nếu tạo thành công
    if (embedding && embedding.length > 0) {
      fields.embedding = embedding;
    }

    return fields;
  }
}
