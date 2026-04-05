import { randomUUID } from 'crypto';
import { MongoClient } from 'mongodb';

type BenchmarkSummary = {
  label: string;
  runs: number[];
  averageMs: number;
  maxMs: number;
  minMs: number;
};

function avg(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarize(label: string, runs: number[]): BenchmarkSummary {
  return {
    label,
    runs,
    averageMs: avg(runs),
    maxMs: Math.max(...runs),
    minMs: Math.min(...runs),
  };
}

async function run(): Promise<void> {
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017';
  const dbName = process.env.MONGO_DB_NAME ?? 'inventory_management';
  const requestedSeedSize = Number(process.env.US26_BENCH_SEED_SIZE ?? '2000');
  const seedSize = Number.isFinite(requestedSeedSize)
    ? Math.max(21, Math.floor(requestedSeedSize))
    : 2000;

  const actor = `us26-bench-operator-${Date.now()}`;
  const lotPrefix = `US26-BENCH-LOT-${Date.now()}`;
  const referenceKeyword = 'US26-REF-TARGET';
  const materialKeyword = 'US26-MAT-TARGET';

  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db(dbName);
  const transactionCollection = db.collection('inventory_transactions');
  const lotCollection = db.collection('inventory_lots');

  const lots = Array.from({ length: seedSize }).map((_, index) => {
    const lotId = `${lotPrefix}-${index + 1}`;
    const isTarget = index % 50 === 0;

    return {
      lot_id: lotId,
      material_id: isTarget ? materialKeyword : `US26-MAT-${index + 1}`,
      manufacturer_name: 'Benchmark Manufacturer',
      manufacturer_lot: `MFG-${index + 1}`,
      received_date: new Date('2026-01-01T00:00:00.000Z'),
      expiration_date: new Date('2028-01-01T00:00:00.000Z'),
      status: 'Accepted',
      quantity: 100,
      unit_of_measure: 'kg',
      is_sample: false,
      notes: 'US26 benchmark seed lot',
      created_date: new Date(),
      modified_date: new Date(),
    };
  });

  const transactions = lots.map((lot, index) => {
    const isTarget = index % 50 === 0;
    const transactionDate = new Date(Date.now() - index * 60000);

    return {
      transaction_id: randomUUID(),
      lot_id: lot.lot_id,
      transaction_type: index % 2 === 0 ? 'Receipt' : 'Usage',
      quantity: index % 2 === 0 ? 10 : -5,
      unit_of_measure: 'kg',
      transaction_date: transactionDate,
      reference_number: isTarget ? referenceKeyword : `US26-REF-${index + 1}`,
      performed_by: actor,
      notes: 'US26 benchmark seed transaction',
    };
  });

  await lotCollection.insertMany(lots);
  await transactionCollection.insertMany(transactions);

  const runNoKeywordQuery = async (): Promise<number> => {
    const startedAt = performance.now();
    await transactionCollection
      .find({ performed_by: actor })
      .sort({ transaction_date: -1 })
      .limit(20)
      .toArray();
    return performance.now() - startedAt;
  };

  const runKeywordQuery = async (keyword: string): Promise<number> => {
    const startedAt = performance.now();

    await transactionCollection
      .aggregate([
        { $match: { performed_by: actor } },
        {
          $lookup: {
            from: 'inventory_lots',
            localField: 'lot_id',
            foreignField: 'lot_id',
            as: 'lot_docs',
          },
        },
        {
          $addFields: {
            material_id: {
              $ifNull: [{ $arrayElemAt: ['$lot_docs.material_id', 0] }, null],
            },
          },
        },
        {
          $match: {
            $or: [
              { transaction_id: { $regex: keyword, $options: 'i' } },
              { reference_number: { $regex: keyword, $options: 'i' } },
              { lot_id: { $regex: keyword, $options: 'i' } },
              { material_id: { $regex: keyword, $options: 'i' } },
            ],
          },
        },
        { $sort: { transaction_date: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    return performance.now() - startedAt;
  };

  try {
    const warmupRuns = 2;
    const measureRuns = 5;

    for (let i = 0; i < warmupRuns; i += 1) {
      await runNoKeywordQuery();
      await runKeywordQuery(referenceKeyword);
      await runKeywordQuery(materialKeyword);
    }

    const noKeywordRuns: number[] = [];
    const referenceKeywordRuns: number[] = [];
    const materialKeywordRuns: number[] = [];

    for (let i = 0; i < measureRuns; i += 1) {
      noKeywordRuns.push(await runNoKeywordQuery());
      referenceKeywordRuns.push(await runKeywordQuery(referenceKeyword));
      materialKeywordRuns.push(await runKeywordQuery(materialKeyword));
    }

    const summaries = [
      summarize('no-keyword', noKeywordRuns),
      summarize('keyword-reference_number', referenceKeywordRuns),
      summarize('keyword-material_id', materialKeywordRuns),
    ];

    console.log('US26 Benchmark Seed Size:', seedSize);
    console.log('US26 Benchmark Actor:', actor);
    for (const summary of summaries) {
      console.log(
        `${summary.label}: avg=${summary.averageMs.toFixed(2)}ms, min=${summary.minMs.toFixed(2)}ms, max=${summary.maxMs.toFixed(2)}ms`,
      );
    }
  } finally {
    await transactionCollection.deleteMany({ performed_by: actor });
    await lotCollection.deleteMany({ lot_id: { $regex: `^${lotPrefix}` } });
    await client.close();
  }
}

run().catch((error: unknown) => {
  console.error('US26 benchmark failed:', error);
  process.exitCode = 1;
});
