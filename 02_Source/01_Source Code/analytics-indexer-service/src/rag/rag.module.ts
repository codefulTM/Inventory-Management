/**
 * File: rag/rag.module.ts
 * Mục đích: Module quản lý các dịch vụ RAG (Retrieval-Augmented Generation)
 * 
 * RAG giúp nâng cao tìm kiếm băng cách:
 * 1. Chuyển đổi tài liệu thành vector embeddings (danh sách số)
 * 2. Lưu trữ trong Elasticsearch với dense_vector field
 * 3. Tìm kiếm ngữ nghĩa (semantic search) thay vì từ khóa
 * 
 * Module này cung cấp 3 dịch vụ chính:
 * - EmbeddingService: Tạo vector embeddings từ text
 * - RedisEmbeddingCacheService: Cache embeddings để tái sử dụng
 * - RagDocumentEnricherService: Làm giàu tài liệu với embedding và metadata
 * 
 * Đánh dấu @Global() để có thể inject ở bất kỳ đâu
 */
import { Global, Module } from '@nestjs/common';
import { RedisEmbeddingCacheService } from './redis-embedding-cache.service';
import { EmbeddingService } from './embedding.service';
import { RagDocumentEnricherService } from './rag-document-enricher.service';

// Module toàn cục cho RAG
@Global()
@Module({
  providers: [
    // Cache embedding trong Redis (tránh gọi API nhiều lần)
    RedisEmbeddingCacheService,
    // Service tạo embedding từ text (qua HuggingFace API)
    EmbeddingService,
    // Service làm giàu tài liệu (thêm embedding, rag_text, metadata)
    RagDocumentEnricherService
  ],
  // Export để các module khác có thể sử dụng
  exports: [RedisEmbeddingCacheService, EmbeddingService, RagDocumentEnricherService],
})
export class RagModule {}
