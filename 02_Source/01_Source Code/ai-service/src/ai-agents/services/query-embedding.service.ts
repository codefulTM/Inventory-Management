// Service tạo embedding vector cho query (dùng trong hybrid search)
// Gọi Embedding API (thường là HuggingFace Inference API) để chuyển text sang vector
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class QueryEmbeddingService {
  private readonly logger = new Logger(QueryEmbeddingService.name);
  private readonly apiUrl: string; // URL của Embedding API
  private readonly apiKey: string; // API Key (HuggingFace)
  private readonly timeoutMs: number; // Timeout cho request (ms)
  private readonly vectorDims: number; // Số chiều vector (mặc định 384)

  // Các cờ để chỉ cảnh báo một lần
  private warnedMissingApiUrl = false;
  private warnedMissingApiKey = false;

  constructor(private readonly configService: ConfigService) {
    // Đọc cấu hình từ environment variables
    this.apiUrl = this.configService.get<string>("EMBEDDING_API_URL") ?? "";
    this.apiKey = this.configService.get<string>("HUGGINGFACE_API_KEY") ?? "";
    this.timeoutMs =
      this.configService.get<number>("EMBEDDING_TIMEOUT_MS") ?? 10000; // 10 giây
    this.vectorDims =
      this.configService.get<number>("EMBEDDING_VECTOR_DIMS") ?? 384; // embedding dimension
  }

  // Tạo embedding vector từ truy vấn (query)
  // Trả về: Mảng số (vector) hoặc null nếu thất bại
  async embedQuery(query: string): Promise<number[] | null> {
    const normalized = query.trim();
    if (!normalized) return null;

    // Kiểm tra cấu hình API URL
    if (!this.apiUrl) {
      if (!this.warnedMissingApiUrl) {
        this.logger.warn(
          "EMBEDDING_API_URL missing. Hybrid retrieval disabled.",
        );
        this.warnedMissingApiUrl = true;
      }
      return null;
    }

    // Kiểm tra API Key
    if (!this.apiKey) {
      if (!this.warnedMissingApiKey) {
        this.logger.warn(
          "HUGGINGFACE_API_KEY missing. Hybrid retrieval disabled.",
        );
        this.warnedMissingApiKey = true;
      }
      return null;
    }

    // Cấu hình timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // Gọi Embedding API (thường là HuggingFace Inference API)
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: normalized, // Text cần chuyển sang vector
          options: { wait_for_model: true }, // Đợi model load nếu cần
        }),
        signal: controller.signal,
      });

      // Kiểm tra HTTP status
      if (!response.ok) {
        const message = await response.text();
        this.logger.warn(
          `Query embedding failed (${response.status}): ${message.slice(0, 200)}`,
        );
        return null;
      }

      // Parse và chuẩn hóa vector
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

  // Parse payload từ Embedding API
  // Hỗ trợ 2 format: [1,2,3,...] hoặc [[1,2,3,...]]
  private parseVector(payload: unknown): number[] | null {
    // Format 1: Trực tiếp là mảng số
    if (
      Array.isArray(payload) &&
      payload.every((item) => typeof item === "number")
    ) {
      return payload as number[];
    }

    // Format 2: Là mảng chứa mảng số ở phần tử đầu tiên
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

  // Chuẩn hóa vector về đúng số chiều (vectorDims)
  private normalizeVector(vector: number[]): number[] {
    if (this.vectorDims <= 0) return vector;
    // Nếu đã đúng kích thước thì trả về luôn
    if (vector.length === this.vectorDims) return vector;
    // Nếu dài hơn thì cắt bớt
    if (vector.length > this.vectorDims)
      return vector.slice(0, this.vectorDims);

    // Nếu ngắn hơn thì padding thêm 0
    const padded = [...vector];
    while (padded.length < this.vectorDims) {
      padded.push(0);
    }
    return padded;
  }
}
