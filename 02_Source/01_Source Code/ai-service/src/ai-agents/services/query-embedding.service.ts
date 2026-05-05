// === QUERY EMBEDDING SERVICE ===
// Service tạo embedding vector cho query (dùng trong hybrid search)
// Gọi Embedding API (thường là HuggingFace Inference API) để chuyển text sang vector

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class QueryEmbeddingService {
  private readonly logger = new Logger(QueryEmbeddingService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly vectorDims: number;
  private warnedMissingApiUrl = false;
  private warnedMissingApiKey = false;

  constructor(private readonly configService: ConfigService) {
    // [RÚT GỌN: Read EMBEDDING_API_URL, HUGGINGFACE_API_KEY, EMBEDDING_TIMEOUT_MS, EMBEDDING_VECTOR_DIMS from config]
    throw new Error("Skeleton: not implemented");
  }

  async embedQuery(query: string): Promise<number[] | null> {
    // [RÚT GỌN: Validate config, POST to Embedding API with AbortController timeout,
    //  parse response array, normalize vector to correct dims, return or null on failure]
    throw new Error("Skeleton: not implemented");
  }

  private parseEmbeddingResponse(payload: unknown): number[] | null {
    // [RÚT GỌN: Check flat array of numbers or nested array [[...]], return numbers or null]
    throw new Error("Skeleton: not implemented");
  }

  private normalizeVector(vector: number[]): number[] {
    // [RÚT GỌN: If longer than vectorDims, slice; if shorter, pad with zeros]
    throw new Error("Skeleton: not implemented");
  }
}
