/**
 * File: run-once.ts
 * Mục đích: Công cụ CLI chạy một lần (one-shot) để thực hiện đồng bộ dữ liệu thủ công
 * 
 * Cách sử dụng: ts-node src/run-once.ts
 * 
 * Script này sẽ:
 * 1. Khởi tạo ứng dụng NestJS
 * 2. Thực hiện một chu kỳ đồng bộ đầy đủ (full sync cycle)
 * 3. Áp dụng Elasticsearch index templates
 * 4. Kiểm tra số lượng bản ghi giữa Mongo và ES
 * 5. Tự động tắt sau khi hoàn thành
 * 
 * Thích hợp cho việc:
 * - Chạy thử nghiệm đồng bộ lần đầu
 * - Chạy thủ công khi cần thiết
 * - Debug quá trình đồng bộ
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SyncService } from './sync/sync.service';

async function main() {
  console.log('[run-once] Đang khởi tạo ứng dụng...');
  // Tạo context ứng dụng NestJS với đầy đủ logger để theo dõi quá trình
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // Lấy SyncService từ DI container để thực hiện đồng bộ
  const syncService = app.get(SyncService);
  console.log('[run-once] Đang kích hoạt chu kỳ đồng bộ...');
  
  // Chạy full sync với các tùy chọn:
  // - ensureTemplates: true -> Áp dụng ES index templates trước khi sync
  // - verifyCounts: true -> Kiểm tra số lượng bản ghi sau khi sync
  const summary = await syncService.runFullSync({
    ensureTemplates: true,
    verifyCounts: true,
  });
  
  console.log('[run-once] Tổng kết:', JSON.stringify(summary, null, 2));
  console.log('[run-once] Đồng bộ hoàn tất. Đang tắt ứng dụng.');
  
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[run-once] Lỗi nghiêm trọng:', err);
  process.exit(1);
});
