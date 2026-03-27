import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  BatchStatus,
  CreateProductionBatchDto,
} from './create-production-batch.dto';
import { UpdateProductionBatchDto } from './update-production-batch.dto';

type CreatePayload = {
  batch_id: string;
  product_id: string;
  batch_number: string;
  unit_of_measure: string;
  shelf_life_value: number;
  shelf_life_unit: string;
  status: BatchStatus;
  batch_size: number;
};

function buildValidPayload(): CreatePayload {
  return {
    batch_id: '3d594650-3436-453f-901f-f7f66f18f8eb',
    product_id: 'MAT-001',
    batch_number: 'BATCH-2026-001',
    unit_of_measure: 'kg',
    shelf_life_value: 24,
    shelf_life_unit: 'month',
    status: BatchStatus.InProgress,
    batch_size: 500,
  };
}

describe('CreateProductionBatchDto Validation', () => {
  it('should accept valid payload', async () => {
    const dto = plainToInstance(CreateProductionBatchDto, buildValidPayload());

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it.each(Object.values(BatchStatus))(
    'should accept valid status "%s"',
    async (status) => {
      const dto = plainToInstance(CreateProductionBatchDto, {
        ...buildValidPayload(),
        status,
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    },
  );

  it.each([
    'batch_id',
    'product_id',
    'batch_number',
    'unit_of_measure',
    'shelf_life_value',
    'shelf_life_unit',
    'status',
    'batch_size',
  ])('should reject missing required field %s', async (field) => {
    const payload = {
      ...buildValidPayload(),
    } as Record<string, unknown>;
    delete payload[field];

    const dto = plainToInstance(CreateProductionBatchDto, payload);
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === field)).toBe(true);
  });

  it('should reject invalid UUID batch_id', async () => {
    const dto = plainToInstance(CreateProductionBatchDto, {
      ...buildValidPayload(),
      batch_id: 'invalid-uuid',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'batch_id')).toBe(true);
  });

  it.each([
    { field: 'product_id', value: 'A'.repeat(21) },
    { field: 'batch_number', value: 'B'.repeat(51) },
    { field: 'unit_of_measure', value: 'C'.repeat(11) },
  ])(
    'should reject fields exceeding max length: $field',
    async ({ field, value }) => {
      const dto = plainToInstance(CreateProductionBatchDto, {
        ...buildValidPayload(),
        [field]: value,
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === field)).toBe(true);
    },
  );

  it('should reject non-positive shelf_life_value', async () => {
    const dto = plainToInstance(CreateProductionBatchDto, {
      ...buildValidPayload(),
      shelf_life_value: 0,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'shelf_life_value')).toBe(
      true,
    );
  });

  it('should reject missing shelf_life_unit', async () => {
    const dto = plainToInstance(CreateProductionBatchDto, {
      ...buildValidPayload(),
      shelf_life_unit: undefined,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'shelf_life_unit')).toBe(
      true,
    );
  });

  it.each([
    { value: 0, reason: 'zero' },
    { value: -10, reason: 'negative' },
  ])('should reject non-positive batch_size ($reason)', async ({ value }) => {
    const dto = plainToInstance(CreateProductionBatchDto, {
      ...buildValidPayload(),
      batch_size: value,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'batch_size')).toBe(true);
  });

  it('should transform numeric string batch_size to number', () => {
    const dto = plainToInstance(CreateProductionBatchDto, {
      ...buildValidPayload(),
      batch_size: '250',
    });

    expect(typeof dto.batch_size).toBe('number');
    expect(dto.batch_size).toBe(250);
  });
});

describe('UpdateProductionBatchDto Validation', () => {
  it('should accept empty payload for partial update', async () => {
    const dto = plainToInstance(UpdateProductionBatchDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should validate provided partial fields', async () => {
    const dto = plainToInstance(UpdateProductionBatchDto, {
      batch_number: 'BATCH-UPDATED-001',
      status: BatchStatus.OnHold,
      batch_size: 300,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should reject invalid status in partial update', async () => {
    const dto = plainToInstance(UpdateProductionBatchDto, {
      status: 'Invalid Status',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });
});
