import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InventoryAdjustmentService } from './inventory-adjustment.service';
import { InventoryAdjustmentRepository } from './inventory-adjustment.repository';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { InventoryAdjustmentReasonCode } from '../schemas/inventory-adjustment.schema';

function makeDto(
  overrides: Partial<CreateInventoryAdjustmentDto> = {},
): CreateInventoryAdjustmentDto {
  return {
    lot_id: 'd9e2d622-06d0-4c77-a79d-509dbfa2b8a1',
    adjustment_quantity: -5,
    reason_code: InventoryAdjustmentReasonCode.DAMAGED,
    reason_note: 'Hàng bị hỏng trong quá trình vận chuyển',
    unit_cost_snapshot: 10,
    ...overrides,
  };
}

describe('InventoryAdjustmentService', () => {
  let service: InventoryAdjustmentService;
  let repo: jest.Mocked<Partial<InventoryAdjustmentRepository>>;

  beforeEach(() => {
    repo = {
      runInTransaction: jest.fn(),
      findLotByLotId: jest.fn(),
      sumMaterialQuantity: jest.fn(),
      updateLotQuantity: jest.fn(),
      createAdjustmentTransaction: jest.fn(),
      createAdjustment: jest.fn(),
      upsertValuationSummary: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findOneByAdjustmentId: jest.fn(),
    };

    service = new InventoryAdjustmentService(
      repo as unknown as InventoryAdjustmentRepository,
      { nextId: jest.fn().mockImplementation((prefix: string) => Promise.resolve(`${prefix}-1`)) } as any,
    );

    (repo.runInTransaction as jest.Mock).mockImplementation(
      async (work: (session?: unknown) => Promise<unknown>) => work(undefined),
    );

    (repo.findLotByLotId as jest.Mock).mockResolvedValue({
      lot_id: 'd9e2d622-06d0-4c77-a79d-509dbfa2b8a1',
      material_id: 'MAT-001',
      quantity: 20,
      unit_of_measure: 'kg',
    });

    (repo.sumMaterialQuantity as jest.Mock).mockResolvedValue(100);
    (repo.updateLotQuantity as jest.Mock).mockResolvedValue({
      lot_id: 'lot-1',
    });
    (repo.createAdjustmentTransaction as jest.Mock).mockResolvedValue({});
    (repo.createAdjustment as jest.Mock).mockResolvedValue({
      adjustment_id: '11111111-1111-4111-8111-111111111111',
      created_date: new Date('2026-04-04T09:00:00.000Z'),
    });
    (repo.upsertValuationSummary as jest.Mock).mockResolvedValue({});
  });

  it('throws BadRequestException when adjustment_quantity is zero', async () => {
    await expect(
      service.create(makeDto({ adjustment_quantity: 0 }), {
        actor: 'manager01',
        role: 'Manager',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when reason_code=OTHER and reason_note is missing', async () => {
    await expect(
      service.create(
        makeDto({
          reason_code: InventoryAdjustmentReasonCode.OTHER,
          reason_note: '   ',
        }),
        {
          actor: 'manager01',
          role: 'Manager',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when lot does not exist', async () => {
    (repo.findLotByLotId as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      service.create(makeDto(), { actor: 'manager01', role: 'Manager' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when adjustment would make lot quantity negative', async () => {
    (repo.findLotByLotId as jest.Mock).mockResolvedValueOnce({
      lot_id: 'lot-1',
      material_id: 'MAT-001',
      quantity: 2,
      unit_of_measure: 'kg',
    });

    await expect(
      service.create(makeDto({ adjustment_quantity: -3 }), {
        actor: 'manager01',
        role: 'Manager',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates adjustment, linked transaction and valuation summary successfully', async () => {
    const result = await service.create(makeDto({ adjustment_quantity: -5 }), {
      actor: 'manager01',
      role: 'Manager',
    });

    expect(repo.updateLotQuantity).toHaveBeenCalledWith(
      'd9e2d622-06d0-4c77-a79d-509dbfa2b8a1',
      15,
      undefined,
    );
    expect(repo.createAdjustmentTransaction).toHaveBeenCalledTimes(1);
    expect(repo.createAdjustment).toHaveBeenCalledTimes(1);
    expect(repo.upsertValuationSummary).toHaveBeenCalledWith(
      'MAT-001',
      95,
      10,
      950,
      expect.any(String),
      'manager01',
      undefined,
    );

    expect(result).toEqual(
      expect.objectContaining({
        material_id: 'MAT-001',
        valuation_delta: -50,
        performed_by: 'manager01',
      }),
    );
  });

  it('findAll maps query to repository', async () => {
    await service.findAll({
      page: 1,
      limit: 20,
      reason_code: InventoryAdjustmentReasonCode.DAMAGED,
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-04T00:00:00.000Z',
    });

    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        reason_code: InventoryAdjustmentReasonCode.DAMAGED,
      }),
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('findOne throws NotFoundException for unknown adjustment', async () => {
    (repo.findOneByAdjustmentId as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      service.findOne('11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
