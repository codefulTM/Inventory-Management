/**
 * File: sync-admin.ts
 * Mục đích: Công cụ CLI quản trị (Admin CLI) cho việc đồng bộ dữ liệu
 * 
 * Các chế độ (mode) hỗ trợ:
 * - backfill: Đồng bộ dữ liệu theo khoảng thời gian (mặc định)
 * - watermark-inspect: Kiểm tra watermark hiện tại của các collection
 * - watermark-reset: Xóa watermark để chạy lại từ đầu
 * - count-check: Kiểm tra sự chênh lệch số lượng bản ghi giữa MongoDB và Elasticsearch
 * 
 * Cách sử dụng:
 * ts-node src/sync-admin.ts --mode backfill --collection inventory_transactions --from 2026-01-01
 * ts-node src/sync-admin.ts --mode watermark-inspect
 * ts-node src/sync-admin.ts --mode watermark-reset --collection materials
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SyncService } from './sync/sync.service';

// Các chế độ đồng bộ hỗ trợ
type Mode = 'backfill' | 'watermark-inspect' | 'watermark-reset' | 'count-check';

// Cấu trúc lưu trữ các tham số dòng lệnh đã phân tích
type ParsedArgs = {
  mode: Mode;                    // Chế độ chạy
  collections: string[];          // Danh sách các collection cần xử lý
  from?: Date;                    // Thời gian bắt đầu (cho backfill)
  to?: Date;                      // Thời gian kết thúc
  dryRun: boolean;                // Chạy thử, không ghi dữ liệu thực
  batchSize?: number;             // Kích thước mỗi lô (batch)
  ensureTemplates: boolean;       // Có áp dụng ES index templates không
  verifyCounts: boolean;          // Có kiểm tra số lượng bản ghi không
  help: boolean;                  // Hiển thị trợ giúp
};

/**
 * Phân tích các tham số dòng lệnh (argv) để trích xuất các tùy chọn cấu hình
 * Hỗ trợ cả hai định dạng: --key=value và --key value
 * @param argv - Mảng tham số dòng lệnh (process.argv)
 * @returns Đối tượng ParsedArgs chứa các tùy chọn đã được phân tích
 */
function parseArgs(argv: string[]): ParsedArgs {
  const options = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    // Bỏ qua các tham số không bắt đầu bằng --
    if (!token.startsWith('--')) {
      continue;
    }

    // Tách key và value (hỗ trợ cả --key=value và --key value)
    const [key, inlineValue] = token.replace(/^--/, '').split('=');
    if (inlineValue !== undefined) {
      options.set(key, inlineValue);
      continue;
    }

    // Kiểm tra tham số tiếp theo có phải là value không
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options.set(key, next);
      index += 1;
      continue;
    }

    // Nếu không có value -> coi như flag boolean = true
    options.set(key, true);
  }

  // Xác định chế độ chạy (mode)
  const mode = String(options.get('mode') ?? 'backfill') as Mode;
  // Kiểm tra mode có hợp lệ không
  if (
    !['backfill', 'watermark-inspect', 'watermark-reset', 'count-check'].includes(
      mode,
    )
  ) {
    throw new Error(
      `Chế độ không hỗ trợ: ${mode}. Sử dụng: backfill | watermark-inspect | watermark-reset | count-check`,
    );
  }

  // Phân tích danh sách collection (có thể là chuỗi phân cách bởi dấu phẩy)
  const collectionRaw = String(options.get('collection') ?? '').trim();
  const collections = collectionRaw.length
    ? collectionRaw.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  // Phân tích thời gian bắt đầu (from) và kết thúc (to)
  const fromRaw = options.get('from') ? String(options.get('from')) : undefined;
  const toRaw = options.get('to') ? String(options.get('to')) : undefined;
  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;

  // Kiểm tra tính hợp lệ của ngày tháng
  if (fromRaw && Number.isNaN(from?.getTime())) {
    throw new Error(`Ngày --from không hợp lệ: ${fromRaw}`);
  }

  if (toRaw && Number.isNaN(to?.getTime())) {
    throw new Error(`Ngày --to không hợp lệ: ${toRaw}`);
  }

  // Phân tích kích thước batch
  const batchSizeRaw = options.get('batch-size');
  const batchSize =
    batchSizeRaw !== undefined ? Number(batchSizeRaw) : undefined;
  if (batchSize !== undefined && (!Number.isFinite(batchSize) || batchSize <= 0)) {
    throw new Error(`Giá trị --batch-size không hợp lệ: ${String(batchSizeRaw)}`);
  }

  return {
    mode,
    collections,
    from,
    to,
    dryRun: options.get('dry-run') === true,
    batchSize,
    ensureTemplates: options.get('no-template') !== true,
    verifyCounts: options.get('no-verify') !== true,
    help: options.get('help') === true,
  };
}

/**
 * Hiển thị hướng dẫn sử dụng công cụ CLI
 * In ra các ví dụ sử dụng và danh sách các tùy chọn có thể sử dụng
 */
function printHelp() {
  console.log(`
analytics-indexer-service - Công cụ quản trị đồng bộ dữ liệu

Các ví dụ sử dụng:
  # Đồng bộ tăng dần cho inventory_transactions từ ngày 2026-01-01 đến 2026-03-01
  ts-node src/sync-admin.ts --mode backfill --collection inventory_transactions --from 2026-01-01T00:00:00Z --to 2026-03-01T00:00:00Z
  
  # Chạy thử (dry-run) đồng bộ cho materials và inventory_lots
  ts-node src/sync-admin.ts --mode backfill --dry-run --collection materials,inventory_lots
  
  # Kiểm tra watermark hiện tại của tất cả collections
  ts-node src/sync-admin.ts --mode watermark-inspect
  
  # Xóa watermark của inventory_transactions để chạy lại từ đầu
  ts-node src/sync-admin.ts --mode watermark-reset --collection inventory_transactions
  
  # Kiểm tra sự chênh lệch số lượng bản ghi cho qc_tests
  ts-node src/sync-admin.ts --mode count-check --collection qc_tests --from 2026-01-01T00:00:00Z

Các tùy chọn:
  --mode backfill|watermark-inspect|watermark-reset|count-check
  --collection <tên_collection>  (phân cách bởi dấu phẩy cho nhiều collection)
  --from <ISO datetime>          (thời gian bắt đầu)
  --to <ISO datetime>            (thời gian kết thúc)
  --batch-size <số>              (kích thước mỗi lô, mặc định: 500)
  --dry-run                       (chạy thử, không ghi dữ liệu thực)
  --no-template                   (bỏ qua việc áp dụng ES index templates)
  --no-verify                    (bỏ qua kiểm tra số lượng bản ghi)
  --help                          (hiển thị trợ giúp này)
`);
}

/**
 * Hàm chính thực thi các lệnh đồng bộ dựa trên tham số dòng lệnh
 * Khởi tạo ứng dụng NestJS và gọi các phương thức tương ứng với mode đã chọn
 */
async function main() {
  // Phân tích tham số dòng lệnh
  const args = parseArgs(process.argv.slice(2));
  
  // Hiển thị trợ giúp nếu người dùng yêu cầu
  if (args.help) {
    printHelp();
    return;
  }

  // Khởi tạo ứng dụng NestJS với đầy đủ logger
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  try {
    // Lấy SyncService từ DI container
    const syncService = app.get(SyncService);

    // Chế độ kiểm tra watermark hiện tại
    if (args.mode === 'watermark-inspect') {
      const result = await syncService.inspectWatermarks(
        args.collections.length > 0 ? args.collections : undefined,
      );
      console.log(JSON.stringify({ mode: args.mode, result }, null, 2));
      return;
    }

    // Chế độ xóa watermark (để chạy lại từ đầu)
    if (args.mode === 'watermark-reset') {
      const resetCount = await syncService.resetWatermarks(
        args.collections.length > 0 ? args.collections : undefined,
      );
      console.log(JSON.stringify({ mode: args.mode, resetCount }, null, 2));
      return;
    }

    // Chế độ kiểm tra số lượng bản ghi giữa MongoDB và Elasticsearch
    if (args.mode === 'count-check') {
      const result = await syncService.runCountChecks({
        collections: args.collections.length > 0 ? args.collections : undefined,
        from: args.from,
        to: args.to,
      });
      console.log(JSON.stringify({ mode: args.mode, result }, null, 2));
      return;
    }

    // Chế độ backfill - đồng bộ dữ liệu theo khoảng thời gian
    const summary = await syncService.runFullSync({
      collections: args.collections.length > 0 ? args.collections : undefined,
      from: args.from,
      to: args.to,
      dryRun: args.dryRun,
      batchSize: args.batchSize,
      ensureTemplates: args.ensureTemplates,
      verifyCounts: args.verifyCounts,
      // Chỉ cập nhật watermark khi không phải dry-run
      updateWatermark: !args.dryRun,
    });

    console.log(JSON.stringify({ mode: args.mode, summary }, null, 2));
  } finally {
    // Đóng ứng dụng NestJS
    await app.close();
  }
}

// Xử lý lỗi khi chạy main
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[sync-admin] thất bại:', message);
  process.exit(1);
});
