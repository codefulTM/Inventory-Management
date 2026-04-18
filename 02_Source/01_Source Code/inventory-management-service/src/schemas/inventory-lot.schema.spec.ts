import 'reflect-metadata';
import { InventoryLotStatus } from '../inventory-lot/inventory-lot.dto';
import { InventoryLot, InventoryLotSchema } from './inventory-lot.schema';

jest.mock(
  'src/inventory-lot/inventory-lot.dto',
  () => ({
    InventoryLotStatus: {
      QUARANTINE: 'Quarantine',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
      DEPLETED: 'Depleted',
    },
  }),
  { virtual: true },
);

type SchemaPathLike = {
  instance: string;
  options: {
    required?: boolean;
    maxlength?: number;
    enum?: readonly string[];
    default?: unknown;
  };
};

describe('InventoryLotSchema', () => {
  it('should define schema from InventoryLot class', () => {
    expect(InventoryLot).toBeDefined();
    expect(InventoryLot.name).toBe('InventoryLot');
    expect(InventoryLotSchema).toBeDefined();
  });

  it('should configure collection and timestamps', () => {
    expect(InventoryLotSchema.get('collection')).toBe('inventory_lots');
    expect(InventoryLotSchema.get('timestamps')).toEqual({
      createdAt: 'created_date',
      updatedAt: 'modified_date',
    });
  });

  it.each([
    { field: 'lot_id', maxLength: 36 },
    { field: 'material_id', maxLength: 20 },
    { field: 'manufacturer_name', maxLength: 100 },
    { field: 'manufacturer_lot', maxLength: 50 },
    { field: 'unit_of_measure', maxLength: 10 },
  ])(
    'should define required bounded string field $field',
    ({ field, maxLength }) => {
      const path = InventoryLotSchema.path(field) as unknown as SchemaPathLike;

      expect(path.instance).toBe('String');
      expect(path.options.required).toBe(true);
      expect(path.options.maxlength).toBe(maxLength);
    },
  );

  it('should define status as required enum field', () => {
    const path = InventoryLotSchema.path('status') as unknown as SchemaPathLike;

    expect(path.instance).toBe('String');
    expect(path.options.required).toBe(true);
    expect(path.options.enum).toEqual(Object.values(InventoryLotStatus));
  });

  it('should define quantity as required number', () => {
    const path = InventoryLotSchema.path(
      'quantity',
    ) as unknown as SchemaPathLike;

    expect(path.instance).toBe('Number');
    expect(path.options.required).toBe(true);
  });

  it('should define is_sample with boolean type and false default', () => {
    const path = InventoryLotSchema.path(
      'is_sample',
    ) as unknown as SchemaPathLike;

    expect(path.instance).toBe('Boolean');
    expect(path.options.default).toBe(false);
  });

  it.each([
    { field: 'supplier_name', maxLength: 100 },
    { field: 'storage_location', maxLength: 100 },
    { field: 'parent_lot_id', maxLength: 36 },
  ])(
    'should define optional bounded string field $field',
    ({ field, maxLength }) => {
      const path = InventoryLotSchema.path(field) as unknown as SchemaPathLike;

      expect(path.instance).toBe('String');
      expect(path.options.required).not.toBe(true);
      expect(path.options.maxlength).toBe(maxLength);
    },
  );

  it('should define date fields with Date instance type', () => {
    const receivedPath = InventoryLotSchema.path(
      'received_date',
    ) as unknown as SchemaPathLike;
    const expirationPath = InventoryLotSchema.path(
      'expiration_date',
    ) as unknown as SchemaPathLike;
    const inUsePath = InventoryLotSchema.path(
      'in_use_expiration_date',
    ) as unknown as SchemaPathLike;

    expect(receivedPath.instance).toBe('Date');
    expect(expirationPath.instance).toBe('Date');
    expect(inUsePath.instance).toBe('Date');
    expect(receivedPath.options.required).toBe(true);
    expect(expirationPath.options.required).toBe(true);
    expect(inUsePath.options.required).not.toBe(true);
  });

  it('should register all expected indexes', () => {
    expect(InventoryLotSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ lot_id: 1 }, expect.objectContaining({ unique: true })],
        [{ material_id: 1 }, expect.any(Object)],
        [{ status: 1 }, expect.any(Object)],
        [{ expiration_date: 1 }, expect.any(Object)],
        [{ created_date: -1 }, expect.any(Object)],
        [{ material_id: 1, status: 1 }, expect.any(Object)],
        [{ is_sample: 1, parent_lot_id: 1 }, expect.any(Object)],
      ]),
    );
  });

  it('should define exactly seven custom indexes', () => {
    expect(InventoryLotSchema.indexes()).toHaveLength(7);
  });
});
