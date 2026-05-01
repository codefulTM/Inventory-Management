import { MongoClient, Db } from 'mongodb';
import {
  generateSampleDataset,
  type SampleCollectionName,
  type SampleDataProfile,
} from './sample-data.generator';

export const SAMPLE_COLLECTIONS: SampleCollectionName[] = [
  'users',
  'materials',
  'inventory_lots',
  'inventory_transactions',
  'qc_tests',
  'inventory_audit_reports',
  'import_export_orders',
  'production_batches',
  'batch_components',
];

export type SeedOptions = {
  profile: SampleDataProfile;
  seed: string;
  dryRun?: boolean;
  collections?: SampleCollectionName[];
};

export class SampleDataSeeder {
  private readonly client: MongoClient;
  private db: Db | null = null;

  constructor(
    private readonly mongoUri: string,
    private readonly dbName?: string,
  ) {
    this.client = new MongoClient(mongoUri);
  }

  async connect(): Promise<Db> {
    if (this.db) {
      return this.db;
    }

    await this.client.connect();
    this.db = this.client.db(this.resolveDbName());
    return this.db;
  }

  async close(): Promise<void> {
    await this.client.close();
    this.db = null;
  }

  async resetCollections(
    collections: SampleCollectionName[],
    dryRun = false,
  ): Promise<Record<string, number>> {
    const db = await this.connect();
    const result: Record<string, number> = {};

    for (const collection of collections) {
      const count = await db.collection(collection).countDocuments({});
      result[collection] = count;
      if (!dryRun) {
        await db.collection(collection).deleteMany({});
      }
    }

    return result;
  }

  async seed(options: SeedOptions): Promise<Record<string, number>> {
    const { profile, seed, dryRun = false } = options;
    const selectedCollections = options.collections ?? SAMPLE_COLLECTIONS;
    const db = await this.connect();

    const dataset = generateSampleDataset({ profile, seed });
    const insertedCounts: Record<string, number> = {};

    for (const collection of selectedCollections) {
      const documents = dataset[collection] ?? [];
      insertedCounts[collection] = documents.length;
      if (!dryRun && documents.length > 0) {
        await db.collection(collection).insertMany(documents, { ordered: false });
      }
    }

    return insertedCounts;
  }

  private resolveDbName(): string {
    if (this.dbName && this.dbName.trim().length > 0) {
      return this.dbName.trim();
    }

    const uriWithoutQuery = this.mongoUri.split('?')[0] ?? '';
    const rawDbName = uriWithoutQuery.split('/').pop();
    if (!rawDbName || rawDbName.trim().length === 0) {
      return 'inventory';
    }

    return rawDbName.trim();
  }
}
