import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  IdPrefix,
  REDIS_ID_CLIENT,
  REDIS_ID_KEY_MAP,
} from './redis-id.constants';

/**
 * RedisIdService - Dịch vụ tạo ID tự động tăng dần sử dụng Redis
 *
 * Chức năng:
 * - Sử dụng Redis INCR để tạo ID duy nhất, tuần tự (atomically)
 * - Định dạng ID: {PREFIX}-{n} (ví dụ: MAT-001, LOT-042)
 * - Dùng Redis db 1 (tách biệt với analytics-indexer dùng db 0)
 * - Hỗ trợ tạo ID mẫu (sample) với prefix EX- cho dữ liệu test
 *
 * Ưu điểm so với auto-increment MongoDB:
 * - ID được sinh trước khi insert → có thể dùng ngay trong business logic
 * - Không bị race condition trong môi trường multi-instance
 * - Nhanh hơn do Redis INCR là atomic operation
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  IdPrefix,
  REDIS_ID_CLIENT,
  REDIS_ID_KEY_MAP,
} from './redis-id.constants';

/**
 * RedisIdService - Tạo ID auto-increment từ Redis counter
 * Sử dụng Redis db 1, định dạng: {PREFIX}-{n}
 */
@Injectable()
export class RedisIdService {
  private readonly logger = new Logger(RedisIdService.name);

  constructor(@Inject(REDIS_ID_CLIENT) private readonly redis: Redis) {}

  /**
   * Tạo ID tiếp tục cho prefix đã cho
   * Tăng counter trong Redis atomically và trả về {PREFIX}-{n}
   * @param prefix - Tiền tố ID (MAT, LOT, TRX, QCT...)
   * @returns ID mới (ví dụ: MAT-001)
   */
  async nextId(prefix: IdPrefix): Promise<string> {
    const key = REDIS_ID_KEY_MAP[prefix];
    const n = await this.redis.incr(key);
    const id = `${prefix}-${n}`;
    this.logger.debug(`Generated ID: ${id}`);
    return id;
  }

  /**
   * Tạo ID mẫu cho dữ liệu test/seed
   * Định dạng: EX-{PREFIX}-{n} (ví dụ: EX-MAT-1)
   * @param prefix - Tiền tố ID
   * @returns ID mẫu với prefix EX-
   */
  async nextSampleId(prefix: IdPrefix): Promise<string> {
    const id = await this.nextId(prefix);
    return `EX-${id}`;
  }

  /**
   * Xem giá trị counter hiện tại mà không tăng
   * @param prefix - Tiền tố ID cần kiểm tra
   * @returns Giá trị counter hiện tại
   */
  async currentCounter(prefix: IdPrefix): Promise<number> {
    const key = REDIS_ID_KEY_MAP[prefix];
    const val = await this.redis.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  /**
   * Đặt lại counter về giá trị cho trước
   * Dùng cho testing hoặc re-seeding dữ liệu
   * @param prefix - Tiền tố ID cần reset
   * @param value - Giá trị counter mới (mặc định: 0)
   */
  async resetCounter(prefix: IdPrefix, value = 0): Promise<void> {
    const key = REDIS_ID_KEY_MAP[prefix];
    await this.redis.set(key, value);
  }
}
