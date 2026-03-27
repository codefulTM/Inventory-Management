import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateMaterialDto,
  MaterialType,
  UpdateMaterialDto,
} from './material.dto';

type CreatePayload = {
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: MaterialType;
  storage_conditions?: string;
  specification_document?: string;
};

function buildValidCreatePayload(): CreatePayload {
  return {
    material_id: 'MAT-001',
    part_number: 'PN-001',
    material_name: 'Acetaminophen',
    material_type: MaterialType.API,
    storage_conditions: 'Store below 25C',
    specification_document: 'SPEC-API-001',
  };
}

describe('Material DTO Validation', () => {
  describe('MaterialType enum', () => {
    it('should expose all expected material types', () => {
      expect(Object.values(MaterialType)).toEqual([
        'API',
        'Excipient',
        'Dietary Supplement',
        'Container',
        'Closure',
        'Process Chemical',
        'Testing Material',
      ]);
    });
  });

  describe('CreateMaterialDto', () => {
    it('should accept valid payload with all fields', async () => {
      const dto = plainToInstance(CreateMaterialDto, buildValidCreatePayload());

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept payload with only required fields', async () => {
      const payload = buildValidCreatePayload();
      delete payload.storage_conditions;
      delete payload.specification_document;
      const dto = plainToInstance(CreateMaterialDto, payload);

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it.each(Object.values(MaterialType))(
      'should accept valid material_type "%s"',
      async (materialType) => {
        const dto = plainToInstance(CreateMaterialDto, {
          ...buildValidCreatePayload(),
          material_type: materialType,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      },
    );

    it.each(['material_id', 'part_number', 'material_name', 'material_type'])(
      'should reject missing required field %s',
      async (field) => {
        const payload = {
          ...buildValidCreatePayload(),
        } as Record<string, unknown>;
        delete payload[field];
        const dto = plainToInstance(CreateMaterialDto, payload);

        const errors = await validate(dto);

        expect(errors.some((error) => error.property === field)).toBe(true);
      },
    );

    it.each([
      { field: 'material_id', value: '' },
      { field: 'part_number', value: '' },
      { field: 'material_name', value: '' },
    ])(
      'should reject empty required text field $field',
      async ({ field, value }) => {
        const dto = plainToInstance(CreateMaterialDto, {
          ...buildValidCreatePayload(),
          [field]: value,
        });

        const errors = await validate(dto);

        expect(errors.some((error) => error.property === field)).toBe(true);
      },
    );

    it.each([
      { field: 'material_id', value: 'A'.repeat(21) },
      { field: 'part_number', value: 'B'.repeat(21) },
      { field: 'material_name', value: 'C'.repeat(101) },
      { field: 'storage_conditions', value: 'D'.repeat(101) },
      { field: 'specification_document', value: 'E'.repeat(51) },
    ])(
      'should reject fields exceeding max length: $field',
      async ({ field, value }) => {
        const dto = plainToInstance(CreateMaterialDto, {
          ...buildValidCreatePayload(),
          [field]: value,
        });

        const errors = await validate(dto);

        expect(errors.some((error) => error.property === field)).toBe(true);
      },
    );

    it('should reject invalid material_type', async () => {
      const dto = plainToInstance(CreateMaterialDto, {
        ...buildValidCreatePayload(),
        material_type: 'Invalid Type',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'material_type')).toBe(
        true,
      );
    });
  });

  describe('UpdateMaterialDto', () => {
    it('should accept empty object for partial update', async () => {
      const dto = plainToInstance(UpdateMaterialDto, {});

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it.each(Object.values(MaterialType))(
      'should accept valid material_type "%s" for update',
      async (materialType) => {
        const dto = plainToInstance(UpdateMaterialDto, {
          material_type: materialType,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      },
    );

    it.each([
      { field: 'material_name', value: 'A'.repeat(101) },
      { field: 'storage_conditions', value: 'B'.repeat(101) },
      { field: 'specification_document', value: 'C'.repeat(51) },
    ])(
      'should reject update fields exceeding max length: $field',
      async ({ field, value }) => {
        const dto = plainToInstance(UpdateMaterialDto, {
          [field]: value,
        });

        const errors = await validate(dto);

        expect(errors.some((error) => error.property === field)).toBe(true);
      },
    );

    it('should reject empty material_name when provided', async () => {
      const dto = plainToInstance(UpdateMaterialDto, {
        material_name: '',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'material_name')).toBe(
        true,
      );
    });

    it('should reject invalid material_type for update', async () => {
      const dto = plainToInstance(UpdateMaterialDto, {
        material_type: 'NotAllowed',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'material_type')).toBe(
        true,
      );
    });
  });
});
