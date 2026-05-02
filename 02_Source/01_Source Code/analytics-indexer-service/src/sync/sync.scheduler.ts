/**
 * File: sync/sync.scheduler.ts
 * Mục đích: Lên lịch (scheduler) chạy đồng bộ định kỳ
 * 
 * Sử dụng @Cron decorator của @nestjs/schedule
 * Mặc định: Chạy mỗi 10 phút
 * Có thể thay đổi qua biến môi trường: SYNC_INTERVAL_CRON
 * 
 * Cơ chế tránh chồng chéo (overlap):
 * - Flag 'running' đảm bảo chỉ một chu kỳ chạy tại một thời điểm
 * - Nếu chu kỳ trước chưa xong, chu kỳ mới sẽ bị bỏ qua
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SyncService } from './sync.service';

// Biểu thức Cron mặc định: mỗi 10 phút
// Có thể ghi đè qua biến môi trường SYNC_INTERVAL_CRON
const SYNC_CRON_EXPRESSION =
  process.env.SYNC_INTERVAL_CRON || '*/10 * * * *';

@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);
  // Flag đánh dấu đang có chu kỳ đồng bộ chạy
  private running = false;

  constructor(
    private readonly syncService: SyncService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Phương thức được gọi định kỳ theo biểu thức Cron
   * Mặc định: mỗi 10 phút một lần
   * Có thể thay đổi qua biến môi trường SYNC_INTERVAL_CRON
   */
  @Cron(SYNC_CRON_EXPRESSION)
  async runSync(): Promise<void> {
    // Kiểm tra nếu đang có chu kỳ khác chạy -> bỏ qua
    if (this.running) {
      this.logger.warn('Chu kỳ đồng bộ trước vẫn đang chạy — bỏ qua lần này');
      return;
    }
    
    // Đặt flag running = true
    this.running = true;
    try {
      // Thực hiện đồng bộ toàn bộ collections
      await this.syncService.runFullSync();
    } catch (err: any) {
      this.logger.error(`Lỗi không xử lý được trong chu kỳ đồng bộ: ${err?.message ?? err}`);
    } finally {
      // Đặt lại flag khi kết thúc (bất kể thành công hay thất bại)
      this.running = false;
    }
  }
}
