import 'reflect-metadata';
import { Schema as MongooseSchema } from 'mongoose';
import { BatchComponent, BatchComponentSchema } from './batch-component.schema';

type SchemaPathLike = {
  instance: string;
  options: {
    required?: boolean;
    maxlength?: number;
    unique?: boolean;
    type?: unknown;
  };
};

describe('BatchComponentSchema', () => {
  it('should define schema from BatchComponent class', () => {
    expect(BatchComponent).toBeDefined();
    expect(BatchComponent.name).toBe('BatchComponent');
    expect(BatchComponentSchema).toBeDefined();
  });

  it('should configure collection and timestamps', () => {
    expect(BatchComponentSchema.get('collection')).toBe('batch_components');
    expect(BatchComponentSchema.get('timestamps')).toEqual({
      createdAt: 'created_date',
      updatedAt: 'modified_date',
    });
  });

  it.each([
    { field: 'component_id', maxLength: 36, unique: true },
    { field: 'batch_id', maxLength: 36, unique: false },
    { field: 'lot_id', maxLength: 36, unique: false },
  ])(
    'should define bounded string field $field',
    ({ field, maxLength, unique }) => {
      const path = BatchComponentSchema.path(
        field,
      ) as unknown as SchemaPathLike;

      expect(path.instance).toBe('String');
      expect(path.options.required).toBe(true);
      expect(path.options.maxlength).toBe(maxLength);
      if (unique) {
        expect(path.options.unique).toBe(true);
      }
    },
  );

  it('should define planned_quantity as required Decimal128', () => {
    const path = BatchComponentSchema.path(
      'planned_quantity',
    ) as unknown as SchemaPathLike;

    expect(path.instance).toBe('Decimal128');
    expect(path.options.required).toBe(true);
    expect(path.options.type).toBe(MongooseSchema.Types.Decimal128);
  });

  it('should define actual_quantity as optional Decimal128', () => {
    const path = BatchComponentSchema.path(
      'actual_quantity',
    ) as unknown as SchemaPathLike;

    expect(path.instance).toBe('Decimal128');
    expect(path.options.required).not.toBe(true);
    expect(path.options.type).toBe(MongooseSchema.Types.Decimal128);
  });

  it('should define unit_of_measure as required bounded string', () => {
    const path = BatchComponentSchema.path(
      'unit_of_measure',
    ) as unknown as SchemaPathLike;

    expect(path.instance).toBe('String');
    expect(path.options.required).toBe(true);
    expect(path.options.maxlength).toBe(10);
  });

  it('should define optional addition_date and added_by fields', () => {
    const additionDatePath = BatchComponentSchema.path(
      'addition_date',
    ) as unknown as SchemaPathLike;
    const addedByPath = BatchComponentSchema.path(
      'added_by',
    ) as unknown as SchemaPathLike;

    expect(additionDatePath.instance).toBe('Date');
    expect(additionDatePath.options.required).not.toBe(true);

    expect(addedByPath.instance).toBe('String');
    expect(addedByPath.options.required).not.toBe(true);
    expect(addedByPath.options.maxlength).toBe(50);
  });
});
