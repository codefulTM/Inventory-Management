import { SyncScheduler } from './sync.scheduler';
import { SyncService } from './sync.service';
import { ConfigService } from '@nestjs/config';

describe('SyncScheduler', () => {
  let scheduler: SyncScheduler;
  let syncService: jest.Mocked<Pick<SyncService, 'runFullSync'>>;

  beforeEach(() => {
    syncService = { runFullSync: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn() } as unknown as ConfigService;
    scheduler = new SyncScheduler(syncService as any, config);
  });

  it('calls syncService.runFullSync on tick', async () => {
    await scheduler.runSync();
    expect(syncService.runFullSync).toHaveBeenCalledTimes(1);
  });

  it('skips tick when a previous cycle is still running', async () => {
    // Simulate a long-running first call
    let resolveFirst!: () => void;
    syncService.runFullSync
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => { resolveFirst = resolve; }),
      )
      .mockResolvedValue(undefined);

    const firstTick = scheduler.runSync();   // starts, not yet done
    await scheduler.runSync();               // should skip (running = true)

    resolveFirst();
    await firstTick;

    expect(syncService.runFullSync).toHaveBeenCalledTimes(1);
  });

  it('resets running flag after sync completes', async () => {
    await scheduler.runSync();
    await scheduler.runSync();
    expect(syncService.runFullSync).toHaveBeenCalledTimes(2);
  });

  it('resets running flag even when sync throws', async () => {
    syncService.runFullSync
      .mockRejectedValueOnce(new Error('crash'))
      .mockResolvedValue(undefined);

    await scheduler.runSync(); // first call throws — flag must reset
    await scheduler.runSync(); // second call should proceed

    expect(syncService.runFullSync).toHaveBeenCalledTimes(2);
  });
});
