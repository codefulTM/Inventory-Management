/**
 * File: redis/redis-watermark.service.ts
 * Mục đích: Quản lý watermark đồng bộ sử dụng Redis
 * 
 * Watermark là dấu thời gian (timestamp) cho biết lần đồng bộ cuối cùng của mỗi collection
 * - Khi chạy lần đầu: watermark = null -> đồng bộ toàn bộ lịch sử (full sync)
 * - Khi chạy các lần sau: chỉ đồng bộ dữ liệu mới từ sau watermark
 * 
 * Key format trong Redis: analytics:watermark:{collection_name}
 * Ví dụ: analytics:watermark:inventory_lots
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

// Tiền tố cho tất cả các key watermark trong Redis
const KEY_PREFIX = 'analytics:watermark';

@Injectable()
export class RedisWatermarkService {
  private readonly logger = new Logger(RedisWatermarkService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Lấy watermark (dấu thời gian đồng bộ cuối cùng) của một collection
   * @param collection - Tên collection cần lấy watermark
   * @returns Date object nếu có watermark, null nếu là lần chạy đầu tiên
   * 
   * Nếu chưa có watermark (lần đầu chạy), trả về null để thực hiện full sync
   * Watermark được lưu dưới dạng ISO string trong Redis
   */
  async getWatermark(collection: string): Promise<Date | null> {
    const key = `${KEY_PREFIX}:${collection}`;
    const value = await this.redis.get(key);
    if (!value) return null;
    
    const ts = new Date(value);
    // Kiểm tra tính hợp lệ của ngày
    if (isNaN(ts.getTime())) {
      this.logger.warn(`Watermark không hợp lệ cho ${collection}: "${value}"`);
      return null;
    }
    return ts;
  }

  /**
   * Lưu watermark cho một collection sau khi đồng bộ thành công
   * @param collection - Tên collection
   * @param ts - Thời gian để lưu làm watermark (thường là thời điểm kết thúc chu kỳ đồng bộ)
   * 
   * CHỈ gọi method này sau khi đồng bộ thành công
   * Watermark được lưu để lần sau chỉ đồng bộ dữ liệu mới
   */
  async setWatermark(collection: string, ts: Date): Promise<void> {
    const key = `${KEY_PREFIX}:${collection}`;
    await this.redis.set(key, ts.toISOString());
    this.logger.debug(`Đã cập nhật watermark — ${collection}: ${ts.toISOString()}`);
  }

  /**
   * Lấy tất cả watermark hiện có trong Redis
   * @param collections - Danh sách collection cụ thể (tùy chọn)
   * @returns Object chứa watermark của từng collection
   * 
   * Nếu không chỉ định collections, sẽ lấy tất cả watermark có tiền tố analytics:watermark:*
   */
  async getAllWatermarks(
    collections?: string[],
  ): Promise<Record<string, string | null>> {
    // Tạo danh sách keys từ collections được chỉ định hoặc lấy tất cả từ Redis
    const keys =
      collections && collections.length > 0
        ? collections.map((collection) => `${KEY_PREFIX}:${collection}`)
        : await this.redis.keys(`${KEY_PREFIX}:*`);

    if (keys.length === 0) {
      return {};
    }

    // Lấy tất cả giá trị cùng lúc (bulk get)
    const values = await this.redis.mget(...keys);
    const result: Record<string, string | null> = {};

    // Ánh xạ key -> value, loại bỏ tiền tố để lấy tên collection
    keys.forEach((key, index) => {
      const collection = key.replace(`${KEY_PREFIX}:`, '');
      result[collection] = values[index] ?? null;
    });

    return result;
  }

  /**
   * Xóa watermark của một hoặc tất cả collections
   * @param collections - Danh sách collection cần xóa watermark (tùy chọn)
   * @returns Số lượng key đã xóa
   * 
   * Sau khi xóa watermark, lần chạy tiếp theo sẽ thực hiện full sync
   * Thường dùng khi cần đồng bộ lại từ đầu
   */
  async resetWatermarks(collections?: string[]): Promise<number> {
    const keys =
      collections && collections.length > 0
        ? collections.map((collection) => `${KEY_PREFIX}:${collection}`)
        : await this.redis.keys(`${KEY_PREFIX}:*`);

    if (keys.length === 0) {
      return 0;
    }

    // Xóa tất cả keys cùng lúc
    return this.redis.del(...keys);
  }
}
