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
    this.apiUrl = this.configService.get<string>("EMBEDDING_API_URL") ?? "";
    this.apiKey = this.configService.get<string>("HUGGINGFACE_API_KEY") ?? "";
    this.timeoutMs =
      this.configService.get<number>("EMBEDDING_TIMEOUT_MS") ?? 10000;
    this.vectorDims =
      this.configService.get<number>("EMBEDDING_VECTOR_DIMS") ?? 384;
  }

  async embedQuery(query: string): Promise<number[] | null> {
    const normalized = query.trim();
    if (!normalized) return null;

    if (!this.apiUrl) {
      if (!this.warnedMissingApiUrl) {
        this.logger.warn(
          "EMBEDDING_API_URL missing. Hybrid retrieval disabled.",
        );
        this.warnedMissingApiUrl = true;
      }
      return null;
    }

    if (!this.apiKey) {
      if (!this.warnedMissingApiKey) {
        this.logger.warn(
          "HUGGINGFACE_API_KEY missing. Hybrid retrieval disabled.",
        );
        this.warnedMissingApiKey = true;
      }
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: normalized,
          options: { wait_for_model: true },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await response.text();
        this.logger.warn(
          `Query embedding failed (${response.status}): ${message.slice(0, 200)}`,
        );
        return null;
      }

      const payload = (await response.json()) as unknown;
      const parsed = this.parseVector(payload);
      if (!parsed || parsed.length === 0) return null;

      return this.normalizeVector(parsed);
    } catch (error: any) {
      this.logger.warn(
        `Query embedding request error: ${error?.message ?? error}`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseVector(payload: unknown): number[] | null {
    if (
      Array.isArray(payload) &&
      payload.every((item) => typeof item === "number")
    ) {
      return payload as number[];
    }

    if (
      Array.isArray(payload) &&
      payload.length > 0 &&
      Array.isArray(payload[0]) &&
      (payload[0] as unknown[]).every((item) => typeof item === "number")
    ) {
      return payload[0] as number[];
    }

    return null;
  }

  private normalizeVector(vector: number[]): number[] {
    if (this.vectorDims <= 0) return vector;
    if (vector.length === this.vectorDims) return vector;
    if (vector.length > this.vectorDims)
      return vector.slice(0, this.vectorDims);

    const padded = [...vector];
    while (padded.length < this.vectorDims) {
      padded.push(0);
    }
    return padded;
  }
}
