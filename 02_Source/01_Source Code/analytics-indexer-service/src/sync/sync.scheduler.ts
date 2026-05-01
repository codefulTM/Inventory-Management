import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SyncService } from './sync.service';

const SYNC_CRON_EXPRESSION =
  process.env.SYNC_INTERVAL_CRON || '*/10 * * * *';

@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);
  private running = false;

  constructor(
    private readonly syncService: SyncService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Default: every 10 minutes.
   * Override via SYNC_INTERVAL_CRON env var.
   */
  @Cron(SYNC_CRON_EXPRESSION)
  async runSync(): Promise<void> {
    if (this.running) {
      this.logger.warn('Previous sync cycle still running — skipping this tick');
      return;
    }
    this.running = true;
    try {
      await this.syncService.runFullSync();
    } catch (err: any) {
      this.logger.error(`Unhandled error in sync cycle: ${err?.message ?? err}`);
    } finally {
      this.running = false;
    }
  }
}
