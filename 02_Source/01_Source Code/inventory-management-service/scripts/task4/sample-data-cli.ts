import {
  SAMPLE_COLLECTIONS,
  SampleDataSeeder,
} from '../../src/database/sample-data/sample-data.seeder';
import type { SampleCollectionName, SampleDataProfile } from '../../src/database/sample-data/sample-data.generator';

type CliMode = 'seed' | 'reset' | 'reseed';

type CliOptions = {
  mode: CliMode;
  profile: SampleDataProfile;
  seed: string;
  dryRun: boolean;
  collections: SampleCollectionName[];
  mongoUri: string;
  dbName?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const [key, valueFromToken] = token.replace(/^--/, '').split('=');
    if (valueFromToken !== undefined) {
      args.set(key, valueFromToken);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      args.set(key, next);
      index += 1;
      continue;
    }

    args.set(key, true);
  }

  if (args.has('help')) {
    printHelp();
    process.exit(0);
  }

  const mode = (args.get('mode') ?? 'seed') as CliMode;
  const profile = (args.get('profile') ?? 'medium') as SampleDataProfile;
  const seed = String(args.get('seed') ?? 'task4-sample-data');
  const dryRun = args.get('dry-run') === true;
  const collectionRaw = String(args.get('collection') ?? '').trim();

  const collections = collectionRaw.length > 0
    ? collectionRaw.split(',').map((item) => item.trim()).filter(Boolean) as SampleCollectionName[]
    : SAMPLE_COLLECTIONS;

  validateMode(mode);
  validateProfile(profile);
  validateCollections(collections);

  return {
    mode,
    profile,
    seed,
    dryRun,
    collections,
    mongoUri: String(args.get('mongo-uri') ?? process.env.MONGODB_URI ?? 'mongodb://localhost:27017/inventory'),
    dbName: args.get('db-name') ? String(args.get('db-name')) : process.env.MONGODB_DB_NAME,
  };
}

function validateMode(mode: string): asserts mode is CliMode {
  if (!['seed', 'reset', 'reseed'].includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Use seed | reset | reseed.`);
  }
}

function validateProfile(profile: string): asserts profile is SampleDataProfile {
  if (!['small', 'medium', 'large'].includes(profile)) {
    throw new Error(`Invalid profile: ${profile}. Use small | medium | large.`);
  }
}

function validateCollections(collections: string[]): void {
  const invalid = collections.filter(
    (collection) => !SAMPLE_COLLECTIONS.includes(collection as SampleCollectionName),
  );

  if (invalid.length > 0) {
    throw new Error(
      `Invalid collections: ${invalid.join(', ')}. Allowed: ${SAMPLE_COLLECTIONS.join(', ')}`,
    );
  }
}

function printHelp(): void {
  // Keep output simple so it can be copied directly into shell scripts.
  console.log(`
Task 4 Sample Data CLI

Usage:
  ts-node scripts/task4/sample-data-cli.ts --mode seed --profile medium

Options:
  --mode seed|reset|reseed           Default: seed
  --profile small|medium|large       Default: medium
  --seed <text>                      Default: task4-sample-data
  --collection a,b,c                 Optional collection subset
  --mongo-uri <mongodb-uri>          Default: MONGODB_URI or mongodb://localhost:27017/inventory
  --db-name <name>                   Optional explicit database name
  --dry-run                          Print actions only, no writes
  --help                             Print this help
`);
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const seeder = new SampleDataSeeder(options.mongoUri, options.dbName);

  try {
    await seeder.connect();

    console.log('[task4:data] mode=', options.mode);
    console.log('[task4:data] profile=', options.profile);
    console.log('[task4:data] collections=', options.collections.join(','));
    console.log('[task4:data] dryRun=', options.dryRun);

    if (options.mode === 'reset') {
      const removed = await seeder.resetCollections(options.collections, options.dryRun);
      console.log('[task4:data] reset summary', removed);
      return;
    }

    if (options.mode === 'seed') {
      const removed = await seeder.resetCollections(options.collections, options.dryRun);
      const inserted = await seeder.seed({
        profile: options.profile,
        seed: options.seed,
        dryRun: options.dryRun,
        collections: options.collections,
      });
      console.log('[task4:data] reset summary', removed);
      console.log('[task4:data] seed summary', inserted);
      return;
    }

    const removed = await seeder.resetCollections(options.collections, options.dryRun);
    const inserted = await seeder.seed({
      profile: options.profile,
      seed: options.seed,
      dryRun: options.dryRun,
      collections: options.collections,
    });
    console.log('[task4:data] reseed summary (removed)', removed);
    console.log('[task4:data] reseed summary (inserted)', inserted);
  } finally {
    await seeder.close();
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[task4:data] failed:', message);
  process.exit(1);
});
