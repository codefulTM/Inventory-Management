import 'reflect-metadata';
import { Schema as MongooseSchema } from 'mongoose';
import { LabelTypeValues } from '../label-template/label-template.dto';
import { LabelTemplate, LabelTemplateSchema } from './label-template.schema';

type SchemaPathLike = {
  instance: string;
  options: {
    required?: boolean;
    maxlength?: number;
    enum?: readonly string[];
    type?: unknown;
  };
};

describe('LabelTemplateSchema', () => {
  it('should create a schema for the LabelTemplate class', () => {
    expect(LabelTemplate).toBeDefined();
    expect(LabelTemplate.name).toBe('LabelTemplate');
    expect(LabelTemplateSchema).toBeDefined();
  });

  it('should map timestamps to created_date and modified_date', () => {
    expect(LabelTemplateSchema.get('timestamps')).toEqual({
      createdAt: 'created_date',
      updatedAt: 'modified_date',
    });
  });

  it.each([
    { field: 'template_id', maxLength: 20 },
    { field: 'template_name', maxLength: 100 },
  ])(
    'should define %s as a required bounded string',
    ({ field, maxLength }) => {
      const path = LabelTemplateSchema.path(field) as unknown as SchemaPathLike;

      expect(path.instance).toBe('String');
      expect(path.options.required).toBe(true);
      expect(path.options.maxlength).toBe(maxLength);
    },
  );

  it('should define label_type as a required enum string', () => {
    const path = LabelTemplateSchema.path(
      'label_type',
    ) as unknown as SchemaPathLike;

    expect(path.instance).toBe('String');
    expect(path.options.required).toBe(true);
    expect(path.options.enum).toEqual(LabelTypeValues);
  });

  it('should define template_content as a required string', () => {
    const path = LabelTemplateSchema.path(
      'template_content',
    ) as unknown as SchemaPathLike;

    expect(path.instance).toBe('String');
    expect(path.options.required).toBe(true);
  });

  it.each(['width', 'height'])(
    'should define %s as required Decimal128',
    (field) => {
      const path = LabelTemplateSchema.path(field) as unknown as SchemaPathLike;

      expect(path.instance).toBe('Decimal128');
      expect(path.options.required).toBe(true);
      expect(path.options.type).toBe(MongooseSchema.Types.Decimal128);
    },
  );

  it('should register all expected custom indexes', () => {
    expect(LabelTemplateSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ template_id: 1 }, expect.objectContaining({ unique: true })],
        [{ label_type: 1 }, expect.any(Object)],
        [{ template_name: 'text' }, expect.any(Object)],
        [{ created_date: -1 }, expect.any(Object)],
      ]),
    );
  });

  it('should register exactly four explicit indexes', () => {
    expect(LabelTemplateSchema.indexes()).toHaveLength(4);
  });
});
