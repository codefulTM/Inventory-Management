import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { WarehouseSlipService } from './warehouse-slip.service';
import { WarehouseSlipRepository } from './warehouse-slip.repository';
import { CreateWarehouseSlipDto } from './dto/create-warehouse-slip.dto';

function makeCreateDto(overrides: Partial<CreateWarehouseSlipDto> = {}) {
  return {
    type: 'IN',
    warehouse_id: 'wh-1',
    reference_number: 'REF-1',
    notes: 'note',
    lines: [{ material_id: 'MAT-1', quantity: 5, unit_price: 10, unit: 'kg' }],
    attachments: [],
    ...overrides,
  } as CreateWarehouseSlipDto;
}

describe('WarehouseSlipService', () => {
  let service: WarehouseSlipService;
  let repo: jest.Mocked<Partial<WarehouseSlipRepository>>;
  let inventoryTransactionService: any;
  let inventoryLotService: any;
  let auditLogService: any;

  beforeEach(() => {
    repo = {
      findWarehouseById: jest.fn(),
      findMaterialById: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findOneBySlipId: jest.fn(),
      updateBySlipId: jest.fn(),
      appendAttachment: jest.fn(),
    };

    inventoryTransactionService = {
      getMyHistory: jest.fn(),
      remove: jest.fn(),
    };

    inventoryLotService = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    auditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new WarehouseSlipService(
      repo as any,
      inventoryTransactionService,
      inventoryLotService,
      auditLogService,
      { nextId: jest.fn().mockResolvedValue('SLP-1') } as any,
    );

    // sensible defaults
    (repo.findWarehouseById as jest.Mock).mockResolvedValue({
      warehouse_id: 'wh-1',
      is_active: true,
    });

    (repo.findMaterialById as jest.Mock).mockResolvedValue({
      material_id: 'MAT-1',
      status: 'APPROVED',
    });

    (repo.create as jest.Mock).mockImplementation(async (p: any) => ({
      ...p,
      created_date: new Date(),
    }));
  });

  it('creates a slip successfully', async () => {
    const dto = makeCreateDto();

    const result = await service.create(dto, { actor: 'user1' });

    expect(repo.findWarehouseById).toHaveBeenCalledWith('wh-1');
    expect(repo.findMaterialById).toHaveBeenCalledWith('MAT-1');
    expect(repo.create).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ warehouse_id: 'wh-1' }));
  });

  it('throws BadRequestException when warehouse does not exist', async () => {
    (repo.findWarehouseById as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      service.create(makeCreateDto(), { actor: 'user1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approves IN slip and creates transactions successfully', async () => {
    const slip = {
      slip_id: 'slip-1',
      status: 'PENDING',
      type: 'IN',
      lines: [{ lot_id: 'lot-1', quantity: 5, unit: 'kg' }],
      processed_transactions: [],
    };

    (repo.findOneBySlipId as jest.Mock).mockResolvedValueOnce(slip);

    (inventoryLotService.findById as jest.Mock).mockResolvedValueOnce({
      lot_id: 'lot-1',
      quantity: 10,
      unit_of_measure: 'kg',
    });

    (inventoryLotService.update as jest.Mock).mockResolvedValueOnce({
      lot_id: 'lot-1',
      quantity: 15,
    });

    (
      inventoryTransactionService.getMyHistory as jest.Mock
    ).mockResolvedValueOnce({
      items: [
        {
          _id: 'tx-1',
          quantity: '5',
          transaction_date: new Date(Date.now() + 1000).toISOString(),
        },
      ],
    });

    (repo.updateBySlipId as jest.Mock).mockResolvedValueOnce({
      ...slip,
      status: 'CONFIRMED',
      processed_transactions: ['tx-1'],
    });

    const updated = await service.approve('slip-1', { actor: 'approver' });

    expect(repo.findOneBySlipId).toHaveBeenCalledWith('slip-1');
    expect(inventoryLotService.update).toHaveBeenCalled();
    expect(inventoryTransactionService.getMyHistory).toHaveBeenCalled();
    expect(repo.updateBySlipId).toHaveBeenCalledWith(
      'slip-1',
      expect.objectContaining({ status: 'CONFIRMED' }),
    );

    expect(updated).toEqual(expect.objectContaining({ status: 'CONFIRMED' }));
  });

  it('approve throws BadRequestException when OUT slip has insufficient stock', async () => {
    const slip = {
      slip_id: 'slip-2',
      status: 'PENDING',
      type: 'OUT',
      lines: [{ lot_id: 'lot-2', quantity: 20, unit: 'kg' }],
    };

    (repo.findOneBySlipId as jest.Mock).mockResolvedValueOnce(slip);

    (inventoryLotService.findById as jest.Mock).mockResolvedValueOnce({
      lot_id: 'lot-2',
      quantity: 10,
      unit_of_measure: 'kg',
    });

    await expect(
      service.approve('slip-2', { actor: 'approver' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects slip successfully', async () => {
    const slip = { slip_id: 'slip-3', status: 'PENDING' };
    (repo.findOneBySlipId as jest.Mock).mockResolvedValueOnce(slip);
    (repo.updateBySlipId as jest.Mock).mockResolvedValueOnce({
      ...slip,
      status: 'REJECTED',
      reject_reason: 'bad',
    });

    const res = await service.reject('slip-3', 'bad', { actor: 'u' });

    expect(repo.findOneBySlipId).toHaveBeenCalledWith('slip-3');
    expect(repo.updateBySlipId).toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalled();
    expect(res).toEqual(expect.objectContaining({ status: 'REJECTED' }));
  });

  it('reject throws BadRequestException when reason is empty', async () => {
    const slip = { slip_id: 'slip-4', status: 'PENDING' };
    (repo.findOneBySlipId as jest.Mock).mockResolvedValueOnce(slip);

    await expect(
      service.reject('slip-4', '   ', { actor: 'u' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
