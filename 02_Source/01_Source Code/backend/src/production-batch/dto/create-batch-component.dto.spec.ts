import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBatchComponentDto } from './create-batch-component.dto';
import { UpdateBatchComponentDto } from './update-batch-component.dto';

type CreatePayload = {
  lot_id: string;
  planned_quantity: number;
  actual_quantity?: number;
  unit_of_measure: string;
  addition_date?: string;
  added_by?: string;
};

function buildValidPayload(): CreatePayload {
  return {
    lot_id: '34b8ad57-1f77-468c-8f96-df6f8bdb3354',
    planned_quantity: 100,
    actual_quantity: 95,
    unit_of_measure: 'kg',
    addition_date: '2026-01-15T00:00:00.000Z',
    added_by: 'operator-01',
  };
}

describe('CreateBatchComponentDto Validation', () => {
  it('should accept valid payload', async () => {
    const dto = plainToInstance(CreateBatchComponentDto, buildValidPayload());

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it.each(['lot_id', 'planned_quantity', 'unit_of_measure'])(
    'should reject missing required field %s',
    async (field) => {
      const payload = {
        ...buildValidPayload(),
      } as Record<string, unknown>;
      delete payload[field];

      const dto = plainToInstance(CreateBatchComponentDto, payload);
      const errors = await validate(dto);

      expect(errors.some((error) => error.property === field)).toBe(true);
    },
  );

  it('should reject invalid UUID lot_id', async () => {
    const dto = plainToInstance(CreateBatchComponentDto, {
      ...buildValidPayload(),
      lot_id: 'invalid-uuid',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'lot_id')).toBe(true);
  });

  it.each([
    { field: 'unit_of_measure', value: 'A'.repeat(11) },
    { field: 'added_by', value: 'B'.repeat(51) },
  ])(
    'should reject fields exceeding max length: $field',
    async ({ field, value }) => {
      const dto = plainToInstance(CreateBatchComponentDto, {
        ...buildValidPayload(),
        [field]: value,
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === field)).toBe(true);
    },
  );

  it.each([
    { field: 'planned_quantity', value: 0 },
    { field: 'planned_quantity', value: -1 },
    { field: 'actual_quantity', value: 0 },
    { field: 'actual_quantity', value: -1 },
  ])(
    'should reject non-positive numeric value for $field',
    async ({ field, value }) => {
      const dto = plainToInstance(CreateBatchComponentDto, {
        ...buildValidPayload(),
        [field]: value,
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === field)).toBe(true);
    },
  );

  it('should reject invalid addition_date string', async () => {
    const dto = plainToInstance(CreateBatchComponentDto, {
      ...buildValidPayload(),
      addition_date: 'not-a-date',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'addition_date')).toBe(
      true,
    );
  });

  it('should transform numeric strings using class-transformer', () => {
    const dto = plainToInstance(CreateBatchComponentDto, {
      ...buildValidPayload(),
      planned_quantity: '101',
      actual_quantity: '97',
    });

    expect(typeof dto.planned_quantity).toBe('number');
    expect(typeof dto.actual_quantity).toBe('number');
    expect(dto.planned_quantity).toBe(101);
    expect(dto.actual_quantity).toBe(97);
  });
});

describe('UpdateBatchComponentDto Validation', () => {
  it('should accept empty partial payload', async () => {
    const dto = plainToInstance(UpdateBatchComponentDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should validate provided partial fields', async () => {
    const dto = plainToInstance(UpdateBatchComponentDto, {
      actual_quantity: 100,
      unit_of_measure: 'g',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should reject invalid lot_id in partial update', async () => {
    const dto = plainToInstance(UpdateBatchComponentDto, {
      lot_id: 'invalid-lot-id',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'lot_id')).toBe(true);
  });
});
