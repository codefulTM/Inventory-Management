/**
 * File: rag/redis-embedding-cache.service.ts
 * Mục đích: Cache vector embedding trong Redis để tránh gọi API nhiều lần
 * 
 * Việc tạo embedding từ HuggingFace API tốn thời gian và có rate limit.
 * Service này cache kết quả embedding theo key:
 *   analytics:rag:embedding:{model}:{sha256(text)}
 * 
 * Khi cùng một đoạn text cần embedding lần 2, lấy từ cache thay vì gọi API.
 * Cache có TTL (thời gian sống) để tự động xóa sau một khoảng thời gian.
 */
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { createHash } from 'node:crypto';
import { REDIS_CLIENT } from '../redis/redis.constants';

/** Tiền tố cho tất cả các key cache embedding trong Redis */
const KEY_PREFIX = 'analytics:rag:embedding';

@Injectable()
export class RedisEmbeddingCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Tạo cache key từ model và text
   * @param model - Tên mô hình embedding (ví dụ: all-MiniLM-L6-v2)
   * @param text - Văn bản cần embedding
   * @returns Cache key duy nhất
   * 
   * Sử dụng SHA-256 hash của text để tạo key có độ dài cố định
   * Format: analytics:rag:embedding:{model}:{hash}
   */
  getCacheKey(model: string, text: string): string {
    const hash = createHash('sha256').update(text).digest('hex');
    return `${KEY_PREFIX}:${model}:${hash}`;
  }

  /**
   * Lấy embedding từ cache
   * @param model - Tên mô hình
   * @param text - Văn bản đã embedding
   * @returns Vector embedding hoặc null nếu không có cache
   * 
   * Parse JSON từ Redis và validate kết quả là mảng số
   */
  async get(model: string, text: string): Promise<number[] | null> {
    const key = this.getCacheKey(model, text);
    const value = await this.redis.get(key);
    if (!value) return null;

    try {
      // Parse JSON và filter chỉ giữ lại các phần tử là số
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return null;
      return parsed.filter((item) => typeof item === 'number');
    } catch {
      // JSON bị lỗi -> cache corrupt, trả về null
      return null;
    }
  }

  /**
   * Lưu embedding vào cache với TTL
   * @param model - Tên mô hình
   * @param text - Văn bản đã embedding
   * @param embedding - Vector embedding cần lưu
   * @param ttlSeconds - Thời gian sống (giây)
   * 
   * Serialize embedding thành JSON và lưu vào Redis với expiration
   */
  async set(
    model: string,
    text: string,
    embedding: number[],
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.getCacheKey(model, text);
    await this.redis.set(key, JSON.stringify(embedding), 'EX', ttlSeconds);
  }
}
