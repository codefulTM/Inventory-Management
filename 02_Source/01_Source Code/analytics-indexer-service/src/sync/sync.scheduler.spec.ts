/**
 * File: sync/sync.scheduler.spec.ts
 * Mục đích: Unit tests cho SyncScheduler
 * 
 * Kiểm tra cơ chế scheduling và chống chồng chéo (overlap prevention):
 * - runSync gọi syncService.runFullSync khi tick
 * - Bỏ qua tick nếu chu kỳ trước chưa hoàn thành (running flag)
 * - Reset running flag sau khi sync hoàn tất (kể cả khi throw error)
 */
import { SyncScheduler } from "./sync.scheduler";
import { SyncService, RunFullSyncSummary } from "./sync.service";
import { ConfigService } from "@nestjs/config";

describe("SyncScheduler", () => {
  let scheduler: SyncScheduler;
  let syncService: any;

  beforeEach(() => {
    const makeSummary = (): RunFullSyncSummary => ({
      cycleTo: new Date().toISOString(),
      dryRun: false,
      results: [],
      totalIndexed: 0,
      totalDeleted: 0,
      totalErrors: 0,
    });

    syncService = { runFullSync: jest.fn().mockResolvedValue(makeSummary()) };
    const config = { get: jest.fn() } as unknown as ConfigService;
    scheduler = new SyncScheduler(syncService as any, config);
  });

  it("calls syncService.runFullSync on tick", async () => {
    await scheduler.runSync();
    expect(syncService.runFullSync).toHaveBeenCalledTimes(1);
  });

  it("skips tick when a previous cycle is still running", async () => {
    // Simulate a long-running first call
    let resolveFirst!: (value: RunFullSyncSummary) => void;
    const makeSummary = (): RunFullSyncSummary => ({
      cycleTo: new Date().toISOString(),
      dryRun: false,
      results: [],
      totalIndexed: 0,
      totalDeleted: 0,
      totalErrors: 0,
    });

    syncService.runFullSync
      .mockImplementationOnce(
        () =>
          new Promise<RunFullSyncSummary>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue(makeSummary());

    const firstTick = scheduler.runSync(); // starts, not yet done
    await scheduler.runSync(); // should skip (running = true)

    resolveFirst(makeSummary());
    await firstTick;

    expect(syncService.runFullSync).toHaveBeenCalledTimes(1);
  });

  it("resets running flag after sync completes", async () => {
    await scheduler.runSync();
    await scheduler.runSync();
    expect(syncService.runFullSync).toHaveBeenCalledTimes(2);
  });

  it("resets running flag even when sync throws", async () => {
    const makeSummary = (): RunFullSyncSummary => ({
      cycleTo: new Date().toISOString(),
      dryRun: false,
      results: [],
      totalIndexed: 0,
      totalDeleted: 0,
      totalErrors: 0,
    });

    syncService.runFullSync
      .mockRejectedValueOnce(new Error("crash"))
      .mockResolvedValue(makeSummary());

    await scheduler.runSync(); // first call throws — flag must reset
    await scheduler.runSync(); // second call should proceed

    expect(syncService.runFullSync).toHaveBeenCalledTimes(2);
  });
});
