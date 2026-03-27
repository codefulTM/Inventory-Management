import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateInventoryLotDto,
  InventoryLotStatus,
  UpdateInventoryLotDto,
} from './inventory-lot.dto';

type CreatePayload = {
  lot_id: string;
  material_id: string;
  manufacturer_name: string;
  manufacturer_lot: string;
  supplier_name?: string;
  received_date: string;
  expiration_date: string;
  in_use_expiration_date?: string;
  status: InventoryLotStatus;
  quantity: number;
  unit_of_measure: string;
  storage_location?: string;
  is_sample?: boolean;
  parent_lot_id?: string;
  notes?: string;
};

function buildValidCreatePayload(): CreatePayload {
  return {
    lot_id: 'LOT-2025-0001',
    material_id: 'MAT-001',
    manufacturer_name: 'ABC Pharma',
    manufacturer_lot: 'MFG-LOT-001',
    supplier_name: 'Global Supplier',
    received_date: '2025-01-01T00:00:00.000Z',
    expiration_date: '2026-01-01T00:00:00.000Z',
    in_use_expiration_date: '2025-08-01T00:00:00.000Z',
    status: InventoryLotStatus.QUARANTINE,
    quantity: 100,
    unit_of_measure: 'kg',
    storage_location: 'A1-R1',
    is_sample: false,
    parent_lot_id: 'LOT-2025-0000',
    notes: 'Initial lot',
  };
}

describe('InventoryLot DTO Validation', () => {
  describe('InventoryLotStatus enum', () => {
    it('should expose expected status values', () => {
      expect(Object.values(InventoryLotStatus)).toEqual([
        'Quarantine',
        'Accepted',
        'Rejected',
        'Depleted',
      ]);
    });
  });

  describe('CreateInventoryLotDto', () => {
    it('should accept valid full payload', async () => {
      const dto = plainToInstance(
        CreateInventoryLotDto,
        buildValidCreatePayload(),
      );

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should transform valid date strings to Date instances', () => {
      const dto = plainToInstance(
        CreateInventoryLotDto,
        buildValidCreatePayload(),
      );

      expect(dto.received_date).toBeInstanceOf(Date);
      expect(dto.expiration_date).toBeInstanceOf(Date);
      expect(dto.in_use_expiration_date).toBeInstanceOf(Date);
    });

    it.each(Object.values(InventoryLotStatus))(
      'should accept valid status "%s"',
      async (status) => {
        const dto = plainToInstance(CreateInventoryLotDto, {
          ...buildValidCreatePayload(),
          status,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      },
    );

    it.each([
      'lot_id',
      'material_id',
      'manufacturer_name',
      'manufacturer_lot',
      'received_date',
      'expiration_date',
      'status',
      'quantity',
      'unit_of_measure',
    ])('should reject missing required field %s', async (field) => {
      const payload = {
        ...buildValidCreatePayload(),
      } as Record<string, unknown>;
      delete payload[field];

      const dto = plainToInstance(CreateInventoryLotDto, payload);
      const errors = await validate(dto);

      expect(errors.some((error) => error.property === field)).toBe(true);
    });

    it.each([
      { field: 'lot_id', value: 'A'.repeat(37) },
      { field: 'material_id', value: 'B'.repeat(21) },
      { field: 'manufacturer_name', value: 'C'.repeat(101) },
      { field: 'manufacturer_lot', value: 'D'.repeat(51) },
      { field: 'supplier_name', value: 'E'.repeat(101) },
      { field: 'unit_of_measure', value: 'F'.repeat(11) },
      { field: 'storage_location', value: 'G'.repeat(101) },
      { field: 'parent_lot_id', value: 'H'.repeat(37) },
    ])(
      'should reject fields exceeding max length: $field',
      async ({ field, value }) => {
        const dto = plainToInstance(CreateInventoryLotDto, {
          ...buildValidCreatePayload(),
          [field]: value,
        });

        const errors = await validate(dto);

        expect(errors.some((error) => error.property === field)).toBe(true);
      },
    );

    it.each([
      { field: 'lot_id', value: '' },
      { field: 'material_id', value: '' },
      { field: 'manufacturer_name', value: '' },
      { field: 'manufacturer_lot', value: '' },
      { field: 'unit_of_measure', value: '' },
    ])(
      'should reject empty text required field $field',
      async ({ field, value }) => {
        const dto = plainToInstance(CreateInventoryLotDto, {
          ...buildValidCreatePayload(),
          [field]: value,
        });

        const errors = await validate(dto);

        expect(errors.some((error) => error.property === field)).toBe(true);
      },
    );

    it('should reject non-enum status', async () => {
      const dto = plainToInstance(CreateInventoryLotDto, {
        ...buildValidCreatePayload(),
        status: 'Unknown',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'status')).toBe(true);
    });

    it.each([
      { value: 100.5, description: 'decimal number' },
      { value: '100', description: 'string value' },
    ])(
      'should reject non-integer quantity: $description',
      async ({ value }) => {
        const dto = plainToInstance(CreateInventoryLotDto, {
          ...buildValidCreatePayload(),
          quantity: value,
        });

        const errors = await validate(dto);

        expect(errors.some((error) => error.property === 'quantity')).toBe(
          true,
        );
      },
    );

    it('should reject invalid date values', async () => {
      const dto = plainToInstance(CreateInventoryLotDto, {
        ...buildValidCreatePayload(),
        received_date: 'invalid-date',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'received_date')).toBe(
        true,
      );
    });
  });

  describe('UpdateInventoryLotDto', () => {
    it('should accept valid payload with all required update fields', async () => {
      const dto = plainToInstance(UpdateInventoryLotDto, {
        material_id: 'MAT-001',
        manufacturer_name: 'ABC Pharma',
        manufacturer_lot: 'MFG-LOT-001',
        received_date: '2025-01-01T00:00:00.000Z',
        expiration_date: '2026-01-01T00:00:00.000Z',
        status: InventoryLotStatus.ACCEPTED,
        quantity: 100,
        unit_of_measure: 'kg',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject missing required fields in update dto', async () => {
      const dto = plainToInstance(UpdateInventoryLotDto, {
        notes: 'only notes',
      });

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === 'material_id')).toBe(
        true,
      );
      expect(errors.some((error) => error.property === 'quantity')).toBe(true);
    });

    it('should allow optional update fields when required fields are present', async () => {
      const dto = plainToInstance(UpdateInventoryLotDto, {
        material_id: 'MAT-001',
        manufacturer_name: 'ABC Pharma',
        manufacturer_lot: 'MFG-LOT-001',
        received_date: '2025-01-01T00:00:00.000Z',
        expiration_date: '2026-01-01T00:00:00.000Z',
        status: InventoryLotStatus.ACCEPTED,
        quantity: 100,
        unit_of_measure: 'kg',
        storage_location: 'A2-R2',
        is_sample: true,
        parent_lot_id: '550e8400-e29b-41d4-a716-446655440001',
      });

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
