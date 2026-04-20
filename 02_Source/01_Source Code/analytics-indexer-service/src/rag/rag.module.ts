import { Global, Module } from '@nestjs/common';
import { RedisEmbeddingCacheService } from './redis-embedding-cache.service';
import { EmbeddingService } from './embedding.service';
import { RagDocumentEnricherService } from './rag-document-enricher.service';

@Global()
@Module({
  providers: [RedisEmbeddingCacheService, EmbeddingService, RagDocumentEnricherService],
  exports: [RedisEmbeddingCacheService, EmbeddingService, RagDocumentEnricherService],
})
export class RagModule {}
