/**
 * File: rag/embedding.service.ts
 * Mục đích: Tạo vector embeddings từ văn bản để tìm kiếm ngữ nghĩa
 * 
 * Embedding là quá trình chuyển đổi văn bản thành vector (danh sách số)
 * Hai văn bản có nghĩa tương tự sẽ có vector gần nhau (cosine similarity)
 * 
 * Quy trình tạo embedding:
 * 1. Kiểm tra cache trong Redis (tránh gọi API lặp lại)
 * 2. Nếu không có cache -> gọi HuggingFace Inference API
 * 3. Chuẩn hóa vector (đúng số chiều)
 * 4. Lưu cache vào Redis để tái sử dụng
 * 
 * Mô hình mặc định: sentence-transformers/all-MiniLM-L6-v2 (384 chiều)
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisEmbeddingCacheService } from './redis-embedding-cache.service';

/**
 * Cấu trúc phản hồi từ API embedding
 */
interface EmbeddingResponseShape {
  embedding: number[] | null;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  
  // Các cấu hình từ ConfigService
  private readonly enabled: boolean;         // Bật/tắt RAG
  private readonly apiUrl: string;           // URL của HuggingFace API
  private readonly apiKey: string;           // API key (HUGGINGFACE_API_KEY)
  private readonly model: string;             // Tên mô hình embedding
  private readonly timeoutMs: number;        // Timeout khi gọi API (ms)
  private readonly cacheTtlSeconds: number;  // Thời gian cache trong Redis
  private readonly vectorDims: number;       // Số chiều vector (384, 768, etc.)
  private missingKeyWarned = false;           // Đánh dấu đã cảnh báo thiếu API key

  constructor(
    private readonly config: ConfigService,
    // Cache service để lưu embedding (tránh gọi API nhiều lần)
    private readonly cache: RedisEmbeddingCacheService,
  ) {
    // Đọc cấu hình từ environment variables
    this.enabled = this.config.get<boolean>('rag.enabled') !== false;
    this.apiUrl = this.config.get<string>('rag.embedding.apiUrl') ?? '';
    this.apiKey = this.config.get<string>('rag.embedding.apiKey') ?? '';
    this.model = this.config.get<string>('rag.embedding.model') ?? 'sentence-transformers/all-MiniLM-L6-v2';
    this.timeoutMs = this.config.get<number>('rag.embedding.timeoutMs') ?? 10000;
    this.cacheTtlSeconds =
      this.config.get<number>('rag.embedding.cacheTtlSeconds') ?? 86400; // 24 giờ
    this.vectorDims = this.config.get<number>('rag.embedding.vectorDims') ?? 384;
  }

  /**
   * Tạo embedding vector từ văn bản
   * @param text - Văn bản cần chuyển đổi
   * @returns Vector embedding (number[]) hoặc null
   * 
   * Quy trình:
   * 1. Chuẩn hóa văn bản (trim)
   * 2. Kiểm tra cache trong Redis
   * 3. Nếu có cache -> trả về ngay
   * 4. Nếu không -> gọi API để tạo mới
   * 5. Chuẩn hóa vector (đúng số chiều) và lưu cache
   */
  async embedText(text: string): Promise<number[] | null> {
    const normalizedText = text.trim();
    if (!normalizedText) return null;
    if (!this.enabled) return null;

    // Kiểm tra cache trước
    const cached = await this.cache.get(this.model, normalizedText);
    if (cached && cached.length > 0) {
      return this.normalizeVector(cached);
    }

    // Gọi API để tạo embedding mới
    const generated = await this.fetchEmbedding(normalizedText);
    if (!generated || generated.length === 0) {
      return null;
    }

    // Chuẩn hóa và cache
    const normalized = this.normalizeVector(generated);
    await this.cache.set(this.model, normalizedText, normalized, this.cacheTtlSeconds);
    return normalized;
  }

  /**
   * Gọi HuggingFace Inference API để tạo embedding
   * @param text - Văn bản cần embedding
   * @returns Vector embedding hoặc null
   * 
   * Sử dụng AbortController để timeout nếu API phản hồi chậm
   */
  private async fetchEmbedding(text: string): Promise<number[] | null> {
    if (!this.apiUrl) {
      this.logger.warn('EMBEDDING_API_URL rỗng. Bỏ qua việc tạo embedding.');
      return null;
    }

    if (!this.apiKey) {
      if (!this.missingKeyWarned) {
        this.logger.warn('Thiếu HUGGINGFACE_API_KEY. Embedding bị tắt đến khi cấu hình key.');
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
          `API Embedding thất bại (${response.status}): ${body.slice(0, 200)}`,
        );
        return null;
      }

      const payload = (await response.json()) as unknown;
      const parsed = this.parseEmbeddingResponse(payload);
      return parsed.embedding;
    } catch (error: any) {
      this.logger.warn(`Lỗi yêu cầu embedding: ${error?.message ?? error}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Phân tích phản hồi từ API embedding
   * @param payload - Dữ liệu phản hồi
   * @returns EmbeddingResponseShape
   * 
   * HuggingFace API có thể trả về:
   * - Mảng trực tiếp: [0.1, 0.2, ...]
   * - Mảng lồng: [[0.1, 0.2, ...]]
   */
  private parseEmbeddingResponse(payload: unknown): EmbeddingResponseShape {
    // Trường hợp: [0.1, 0.2, 0.3, ...]
    if (Array.isArray(payload) && payload.every((item) => typeof item === 'number')) {
      return { embedding: payload as number[] };
    }

    // Trường hợp: [[0.1, 0.2, 0.3, ...]]
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

  /**
   * Chuẩn hóa vector để đúng số chiều
   * @param vector - Vector cần chuẩn hóa
   * @returns Vector đã chuẩn hóa
   * 
   * Xử lý:
   * - Nếu vector dài hơn vectorDims -> cắt bớt
   * - Nếu vector ngắn hơn -> thêm số 0 vào cuối
   * - Nếu bằng -> giữ nguyên
   */
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
