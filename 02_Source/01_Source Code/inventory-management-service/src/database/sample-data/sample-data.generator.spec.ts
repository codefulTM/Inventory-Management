import { generateSampleDataset, getProfileCounts } from './sample-data.generator';

describe('sample-data.generator', () => {
  it('generates deterministic output for same seed/profile', () => {
    const first = generateSampleDataset({
      profile: 'small',
      seed: 'stable-seed',
      now: new Date('2026-04-01T00:00:00.000Z'),
    });

    const second = generateSampleDataset({
      profile: 'small',
      seed: 'stable-seed',
      now: new Date('2026-04-01T00:00:00.000Z'),
    });

    expect(first.inventory_transactions[0]).toEqual(second.inventory_transactions[0]);
    expect(first.qc_tests[10]).toEqual(second.qc_tests[10]);
    expect(first.production_batches[5]).toEqual(second.production_batches[5]);
  });

  it('uses larger profile counts for larger datasets', () => {
    const small = generateSampleDataset({
      profile: 'small',
      seed: 'sizes',
      now: new Date('2026-04-01T00:00:00.000Z'),
    });
    const large = generateSampleDataset({
      profile: 'large',
      seed: 'sizes',
      now: new Date('2026-04-01T00:00:00.000Z'),
    });

    expect(large.inventory_lots.length).toBeGreaterThan(small.inventory_lots.length);
    expect(large.inventory_transactions.length).toBeGreaterThan(
      small.inventory_transactions.length,
    );
    expect(large.qc_tests.length).toBeGreaterThan(small.qc_tests.length);
  });

  it('spreads generated transaction dates across a multi-month window', () => {
    const dataset = generateSampleDataset({
      profile: 'medium',
      seed: 'window-check',
      now: new Date('2026-04-19T00:00:00.000Z'),
    });

    const timestamps = dataset.inventory_transactions.map((item) => {
      const date = item.transaction_date as Date;
      return date.getTime();
    });

    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    const days = (max - min) / (1000 * 60 * 60 * 24);

    expect(days).toBeGreaterThanOrEqual(120);
    expect(dataset.materials.length).toBe(getProfileCounts('medium').materials);
  });
});
