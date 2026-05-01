import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SyncService } from './sync/sync.service';

type Mode = 'backfill' | 'watermark-inspect' | 'watermark-reset' | 'count-check';

type ParsedArgs = {
  mode: Mode;
  collections: string[];
  from?: Date;
  to?: Date;
  dryRun: boolean;
  batchSize?: number;
  ensureTemplates: boolean;
  verifyCounts: boolean;
  help: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const options = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const [key, inlineValue] = token.replace(/^--/, '').split('=');
    if (inlineValue !== undefined) {
      options.set(key, inlineValue);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options.set(key, next);
      index += 1;
      continue;
    }

    options.set(key, true);
  }

  const mode = String(options.get('mode') ?? 'backfill') as Mode;
  if (
    !['backfill', 'watermark-inspect', 'watermark-reset', 'count-check'].includes(
      mode,
    )
  ) {
    throw new Error(
      `Unsupported mode: ${mode}. Use backfill | watermark-inspect | watermark-reset | count-check`,
    );
  }

  const collectionRaw = String(options.get('collection') ?? '').trim();
  const collections = collectionRaw.length
    ? collectionRaw.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  const fromRaw = options.get('from') ? String(options.get('from')) : undefined;
  const toRaw = options.get('to') ? String(options.get('to')) : undefined;
  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;

  if (fromRaw && Number.isNaN(from?.getTime())) {
    throw new Error(`Invalid --from date: ${fromRaw}`);
  }

  if (toRaw && Number.isNaN(to?.getTime())) {
    throw new Error(`Invalid --to date: ${toRaw}`);
  }

  const batchSizeRaw = options.get('batch-size');
  const batchSize =
    batchSizeRaw !== undefined ? Number(batchSizeRaw) : undefined;
  if (batchSize !== undefined && (!Number.isFinite(batchSize) || batchSize <= 0)) {
    throw new Error(`Invalid --batch-size value: ${String(batchSizeRaw)}`);
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

function printHelp() {
  console.log(`
analytics-indexer-service sync admin CLI

Usage examples:
  ts-node src/sync-admin.ts --mode backfill --collection inventory_transactions --from 2026-01-01T00:00:00Z --to 2026-03-01T00:00:00Z
  ts-node src/sync-admin.ts --mode backfill --dry-run --collection materials,inventory_lots
  ts-node src/sync-admin.ts --mode watermark-inspect
  ts-node src/sync-admin.ts --mode watermark-reset --collection inventory_transactions
  ts-node src/sync-admin.ts --mode count-check --collection qc_tests --from 2026-01-01T00:00:00Z

Options:
  --mode backfill|watermark-inspect|watermark-reset|count-check
  --collection <a,b,c>
  --from <ISO datetime>
  --to <ISO datetime>
  --batch-size <number>
  --dry-run
  --no-template        Skip applying ES index templates before backfill
  --no-verify          Skip Mongo-vs-ES count checks
  --help
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  try {
    const syncService = app.get(SyncService);

    if (args.mode === 'watermark-inspect') {
      const result = await syncService.inspectWatermarks(
        args.collections.length > 0 ? args.collections : undefined,
      );
      console.log(JSON.stringify({ mode: args.mode, result }, null, 2));
      return;
    }

    if (args.mode === 'watermark-reset') {
      const resetCount = await syncService.resetWatermarks(
        args.collections.length > 0 ? args.collections : undefined,
      );
      console.log(JSON.stringify({ mode: args.mode, resetCount }, null, 2));
      return;
    }

    if (args.mode === 'count-check') {
      const result = await syncService.runCountChecks({
        collections: args.collections.length > 0 ? args.collections : undefined,
        from: args.from,
        to: args.to,
      });
      console.log(JSON.stringify({ mode: args.mode, result }, null, 2));
      return;
    }

    const summary = await syncService.runFullSync({
      collections: args.collections.length > 0 ? args.collections : undefined,
      from: args.from,
      to: args.to,
      dryRun: args.dryRun,
      batchSize: args.batchSize,
      ensureTemplates: args.ensureTemplates,
      verifyCounts: args.verifyCounts,
      updateWatermark: !args.dryRun,
    });

    console.log(JSON.stringify({ mode: args.mode, summary }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[sync-admin] failed:', message);
  process.exit(1);
});
