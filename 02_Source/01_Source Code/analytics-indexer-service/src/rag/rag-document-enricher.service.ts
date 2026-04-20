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
  constructor(private readonly embeddingService: EmbeddingService) {}

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

    return docs;
  }

  async enrichMarkdownChunk(input: MarkdownChunkInput): Promise<Record<string, any>> {
    const retrieved = mapMarkdownChunkToRetrievedDocument(input);
    const embedding = await this.embeddingService.embedText(retrieved.content);

    return {
      id: retrieved.id,
      path: input.path,
      chunk_index: input.chunkIndex,
      section_title: input.sectionTitle ?? null,
      created_date: retrieved.updated_at,
      modified_date: retrieved.updated_at,
      ...this.toRagFields(retrieved, embedding),
    };
  }

  private async enrichWithMapper(
    docs: Record<string, any>[],
    mapper: (doc: Record<string, any>) => RetrievedDocument,
  ): Promise<Record<string, any>[]> {
    const enriched: Record<string, any>[] = [];

    for (const doc of docs) {
      const retrieved = mapper(doc);
      const embedding = await this.embeddingService.embedText(retrieved.content);

      enriched.push({
        ...doc,
        ...this.toRagFields(retrieved, embedding),
      });
    }

    return enriched;
  }

  private toRagFields(retrieved: RetrievedDocument, embedding: number[] | null): Record<string, any> {
    const fields: Record<string, any> = {
      source_type: retrieved.source_type,
      source_id: retrieved.source_id,
      source_collection: retrieved.source_collection,
      rag_text: retrieved.content,
      rag_metadata: retrieved.metadata,
      acl_tags: retrieved.acl_tags,
      updated_at: retrieved.updated_at,
    };

    if (embedding && embedding.length > 0) {
      fields.embedding = embedding;
    }

    return fields;
  }
}
