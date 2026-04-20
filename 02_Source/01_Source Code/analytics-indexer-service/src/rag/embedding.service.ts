import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisEmbeddingCacheService } from './redis-embedding-cache.service';

interface EmbeddingResponseShape {
  embedding: number[] | null;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly enabled: boolean;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly cacheTtlSeconds: number;
  private readonly vectorDims: number;
  private missingKeyWarned = false;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: RedisEmbeddingCacheService,
  ) {
    this.enabled = this.config.get<boolean>('rag.enabled') !== false;
    this.apiUrl = this.config.get<string>('rag.embedding.apiUrl') ?? '';
    this.apiKey = this.config.get<string>('rag.embedding.apiKey') ?? '';
    this.model = this.config.get<string>('rag.embedding.model') ?? 'sentence-transformers/all-MiniLM-L6-v2';
    this.timeoutMs = this.config.get<number>('rag.embedding.timeoutMs') ?? 10000;
    this.cacheTtlSeconds =
      this.config.get<number>('rag.embedding.cacheTtlSeconds') ?? 86400;
    this.vectorDims = this.config.get<number>('rag.embedding.vectorDims') ?? 384;
  }

  async embedText(text: string): Promise<number[] | null> {
    const normalizedText = text.trim();
    if (!normalizedText) return null;
    if (!this.enabled) return null;

    const cached = await this.cache.get(this.model, normalizedText);
    if (cached && cached.length > 0) {
      return this.normalizeVector(cached);
    }

    const generated = await this.fetchEmbedding(normalizedText);
    if (!generated || generated.length === 0) {
      return null;
    }

    const normalized = this.normalizeVector(generated);
    await this.cache.set(this.model, normalizedText, normalized, this.cacheTtlSeconds);
    return normalized;
  }

  private async fetchEmbedding(text: string): Promise<number[] | null> {
    if (!this.apiUrl) {
      this.logger.warn('EMBEDDING_API_URL is empty. Skip embedding generation.');
      return null;
    }

    if (!this.apiKey) {
      if (!this.missingKeyWarned) {
        this.logger.warn('HUGGINGFACE_API_KEY missing. Embedding is disabled until key is configured.');
        this.missingKeyWarned = true;
      }
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          inputs: text,
          options: { wait_for_model: true },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(
          `Embedding API failed (${response.status}): ${body.slice(0, 200)}`,
        );
        return null;
      }

      const payload = (await response.json()) as unknown;
      const parsed = this.parseEmbeddingResponse(payload);
      return parsed.embedding;
    } catch (error: any) {
      this.logger.warn(`Embedding request error: ${error?.message ?? error}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseEmbeddingResponse(payload: unknown): EmbeddingResponseShape {
    if (Array.isArray(payload) && payload.every((item) => typeof item === 'number')) {
      return { embedding: payload as number[] };
    }

    if (
      Array.isArray(payload) &&
      payload.length > 0 &&
      Array.isArray(payload[0]) &&
      (payload[0] as unknown[]).every((item) => typeof item === 'number')
    ) {
      return { embedding: payload[0] as number[] };
    }

    return { embedding: null };
  }

  private normalizeVector(vector: number[]): number[] {
    if (this.vectorDims <= 0) return vector;
    if (vector.length === this.vectorDims) return vector;

    if (vector.length > this.vectorDims) {
      return vector.slice(0, this.vectorDims);
    }

    const padded = [...vector];
    while (padded.length < this.vectorDims) {
      padded.push(0);
    }
    return padded;
  }
}
