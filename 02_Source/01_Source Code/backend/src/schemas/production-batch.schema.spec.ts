import 'reflect-metadata';
import {
  ProductionBatch,
  ProductionBatchSchema,
} from './production-batch.schema';

type SchemaPathLike = {
  instance: string;
  options: {
    required?: boolean;
    maxlength?: number;
    unique?: boolean;
    enum?: readonly string[];
    type?: unknown;
  };
};

describe('ProductionBatchSchema', () => {
  it('should define schema from ProductionBatch class', () => {
    expect(ProductionBatch).toBeDefined();
    expect(ProductionBatch.name).toBe('ProductionBatch');
    expect(ProductionBatchSchema).toBeDefined();
  });

  it('should configure collection and timestamps', () => {
    expect(ProductionBatchSchema.get('collection')).toBe('production_batches');
    expect(ProductionBatchSchema.get('timestamps')).toEqual({
      createdAt: 'created_date',
      updatedAt: 'modified_date',
    });
  });

  it.each([
    {
      field: 'batch_id',
      maxLength: 36,
      unique: true,
    },
    {
      field: 'batch_number',
      maxLength: 50,
      unique: true,
    },
  ])(
    'should define unique required bounded string field $field',
    ({ field, maxLength, unique }) => {
      const path = ProductionBatchSchema.path(
        field,
      ) as unknown as SchemaPathLike;

      expect(path.instance).toBe('String');
      expect(path.options.required).toBe(true);
      expect(path.options.maxlength).toBe(maxLength);
      expect(path.options.unique).toBe(unique);
    },
  );

  it.each([
    { field: 'product_id', maxLength: 20 },
    { field: 'unit_of_measure', maxLength: 10 },
  ])(
    'should define required bounded string field $field',
    ({ field, maxLength }) => {
      const path = ProductionBatchSchema.path(
        field,
      ) as unknown as SchemaPathLike;

      expect(path.instance).toBe('String');
      expect(path.options.required).toBe(true);
      expect(path.options.maxlength).toBe(maxLength);
    },
  );

  it('should define manufacture_date and expiration_date as required dates', () => {
    const manufacturePath = ProductionBatchSchema.path(
      'manufacture_date',
    ) as unknown as SchemaPathLike;
    const expirationPath = ProductionBatchSchema.path(
      'expiration_date',
    ) as unknown as SchemaPathLike;

    expect(manufacturePath.instance).toBe('Date');
    expect(expirationPath.instance).toBe('Date');
    expect(manufacturePath.options.required).toBe(true);
    expect(expirationPath.options.required).toBe(true);
  });

  it('should define status enum with expected allowed values', () => {
    const path = ProductionBatchSchema.path(
      'status',
    ) as unknown as SchemaPathLike;

    expect(path.instance).toBe('String');
    expect(path.options.required).toBe(true);
    expect(path.options.enum).toEqual([
      'In Progress',
      'Complete',
      'On Hold',
      'Cancelled',
    ]);
  });

  it('should define batch_size as required Decimal128 field', () => {
    const path = ProductionBatchSchema.path(
      'batch_size',
    ) as unknown as SchemaPathLike;

    expect(path.instance).toBe('Decimal128');
    expect(path.options.required).toBe(true);
    expect(path.options.type).toBe('Decimal128');
  });
});
