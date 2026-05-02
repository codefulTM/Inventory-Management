/**
 * SampleDataSeeder - Script seed dữ liệu mẫu vào MongoDB
 *
 * Chức năng:
 * - Kết nối trực tiếp đến MongoDB qua MongoClient (native driver)
 * - Reset (xóa) các collections được chỉ định
 * - Seed dữ liệu mẫu sinh từ sample-data.generator.ts
 * - Hỗ trợ dry run mode (chỉ đếm số lượng, không ghi dữ liệu)
 *
 * Sử dụng: Chạy độc lập (không qua NestJS) để tạo dữ liệu test/development
 */
import { MongoClient, Db } from 'mongodb';
import {
  generateSampleDataset,
  type SampleCollectionName,
  type SampleDataProfile,
} from './sample-data.generator';

/** Danh sách collections được seed dữ liệu */
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

/**
 * SampleDataSeeder - Class thực hiện seed dữ liệu mẫu vào MongoDB
 */
export class SampleDataSeeder {
  private readonly client: MongoClient;
  private db: Db | null = null;

  constructor(
    private readonly mongoUri: string,
    private readonly dbName?: string,
  ) {
    this.client = new MongoClient(mongoUri);
  }

  /** Kết nối đến MongoDB (lazy connection - chỉ tạo khi cần) */
  async connect(): Promise<Db> {
    if (this.db) {
      return this.db;
    }

    await this.client.connect();
    this.db = this.client.db(this.resolveDbName());
    return this.db;
  }

  /** Đóng kết nối MongoDB */
  async close(): Promise<void> {
    await this.client.close();
    this.db = null;
  }

  /**
   * Xóa toàn bộ dữ liệu trong các collections được chỉ định
   * @param collections - Danh sách tên collections cần reset
   * @param dryRun - Nếu true, chỉ đếm số lượng record, không xóa
   * @returns Số lượng record đã tồn tại trong mỗi collection
   */
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

  /**
   * Seed dữ liệu mẫu vào các collections
   * Sinh dữ liệu từ generateSampleDataset() và insert vào MongoDB
   * @param options - Profile (small/medium/large), seed string, dryRun flag
   * @returns Số lượng record đã insert vào mỗi collection
   */
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

  /** Tự động xác định tên database từ MongoDB URI */
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
