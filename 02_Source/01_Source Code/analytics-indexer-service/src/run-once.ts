/**
 * One-shot sync runner — triggers a single sync cycle and exits.
 * Usage: ts-node src/run-once.ts
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SyncService } from './sync/sync.service';

async function main() {
  console.log('[run-once] Bootstrapping app...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const syncService = app.get(SyncService);
  console.log('[run-once] Triggering sync cycle...');
  const summary = await syncService.runFullSync({
    ensureTemplates: true,
    verifyCounts: true,
  });
  console.log('[run-once] summary:', JSON.stringify(summary, null, 2));
  console.log('[run-once] Sync complete. Shutting down.');
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[run-once] Fatal error:', err);
  process.exit(1);
});
