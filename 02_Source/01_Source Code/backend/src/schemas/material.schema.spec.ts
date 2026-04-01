import 'reflect-metadata';
import { MaterialType } from '../material/material.dto';
import { Material, MaterialSchema } from './material.schema';

type SchemaPathLike = {
  instance: string;
  options: {
    required?: boolean;
    maxlength?: number;
    enum?: readonly string[];
    default?: unknown;
  };
};

describe('MaterialSchema', () => {
  it('should define schema from Material class', () => {
    expect(Material).toBeDefined();
    expect(Material.name).toBe('Material');
    expect(MaterialSchema).toBeDefined();
  });

  it('should map timestamps to created_date and modified_date', () => {
    expect(MaterialSchema.get('timestamps')).toEqual({
      createdAt: 'created_date',
      updatedAt: 'modified_date',
    });
  });

  it.each([
    { field: 'material_id', maxLength: 20 },
    { field: 'part_number', maxLength: 20 },
    { field: 'material_name', maxLength: 100 },
  ])(
    'should define $field as required string with max length',
    ({ field, maxLength }) => {
      const path = MaterialSchema.path(field) as unknown as SchemaPathLike;

      expect(path.instance).toBe('String');
      expect(path.options.required).toBe(true);
      expect(path.options.maxlength).toBe(maxLength);
    },
  );

  it('should define material_type as required enum string', () => {
    const path = MaterialSchema.path(
      'material_type',
    ) as unknown as SchemaPathLike;

    expect(path.instance).toBe('String');
    expect(path.options.required).toBe(true);
    expect(path.options.enum).toEqual(Object.values(MaterialType));
  });

  it.each([
    { field: 'storage_conditions', maxLength: 100 },
    { field: 'specification_document', maxLength: 50 },
  ])(
    'should define optional $field with maxlength and null default',
    ({ field, maxLength }) => {
      const path = MaterialSchema.path(field) as unknown as SchemaPathLike;

      expect(path.instance).toBe('String');
      expect(path.options.required).not.toBe(true);
      expect(path.options.maxlength).toBe(maxLength);
      expect(path.options.default).toBeNull();
    },
  );

  it('should register expected custom indexes', () => {
    expect(MaterialSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ material_id: 1 }, expect.objectContaining({ unique: true })],
        [{ part_number: 1 }, expect.objectContaining({ unique: true })],
        [{ material_name: 'text' }, expect.any(Object)],
        [{ material_type: 1 }, expect.any(Object)],
        [{ created_date: -1 }, expect.any(Object)],
        [{ material_type: 1, created_date: -1 }, expect.any(Object)],
      ]),
    );
  });

  it('should define exactly six explicit indexes', () => {
    expect(MaterialSchema.indexes()).toHaveLength(6);
  });
});
