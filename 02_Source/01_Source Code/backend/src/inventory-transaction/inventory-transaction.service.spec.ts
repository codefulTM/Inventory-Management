import { BadRequestException } from '@nestjs/common';
import { InventoryTransactionService } from './inventory-transaction.service';
import { InventoryTransactionRepository } from './inventory-transaction.repository';
import {
  CreateInventoryTransactionDto,
  TransactionType,
} from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';

// utility helper
function makeDto(
  overrides: Partial<CreateInventoryTransactionDto> = {},
): CreateInventoryTransactionDto {
  return {
    lot_id: 'lot1',
    transaction_type: TransactionType.Receipt,
    quantity: 10,
    unit_of_measure: 'pcs',
    transaction_date: new Date().toISOString(),
    reference_number: undefined,
    performed_by: 'user1',
    notes: undefined,
    ...overrides,
  } as any;
}

describe('InventoryTransactionService', () => {
  let svc: InventoryTransactionService;
  let repo: Partial<InventoryTransactionRepository>;

  beforeEach(() => {
    repo = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((dto) => Promise.resolve({ ...dto, _id: '123' })),
      update: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(null),
    };
    svc = new InventoryTransactionService(repo as any);
  });

  describe('basic delegation', () => {
    it('getAll passes filters & paging to repo', async () => {
      const f = { lot_id: 'x' };
      const p = { page: 2, limit: 5 };
      await svc.getAll(f, p);
      expect(repo.findAll).toHaveBeenCalledWith(f, p);
    });

    it('getOne delegates', async () => {
      await svc.getOne('id');
      expect(repo.findOne).toHaveBeenCalledWith('id');
    });

    it('update delegates', async () => {
      const dto: UpdateInventoryTransactionDto = { quantity: 1 } as any;
      await svc.update('id', dto);
      expect(repo.update).toHaveBeenCalledWith('id', dto);
    });

    it('remove delegates', async () => {
      await svc.remove('id');
      expect(repo.remove).toHaveBeenCalledWith('id');
    });
  });

  describe('create()', () => {
    it('routes to receipt handler', async () => {
      const dto = makeDto({
        transaction_type: TransactionType.Receipt,
        quantity: 5,
      });
      const created = await svc.create(dto);
      expect(created).toHaveProperty('_id');
    });

    it('throws when receipt quantity <=0', async () => {
      const dto = makeDto({
        transaction_type: TransactionType.Receipt,
        quantity: 0,
      });
      await expect(svc.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when usage quantity >=0', async () => {
      const dto = makeDto({
        transaction_type: TransactionType.Usage,
        quantity: 5,
      });
      await expect(svc.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows split with nonzero quantity', async () => {
      const dto = makeDto({
        transaction_type: TransactionType.Split,
        quantity: -3,
      });
      const res = await svc.create(dto);
      expect(res).toHaveProperty('_id');
    });

    it('throws on split zero quantity', async () => {
      const dto = makeDto({
        transaction_type: TransactionType.Split,
        quantity: 0,
      });
      await expect(svc.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('adjustment quantity cannot be zero', async () => {
      const dto = makeDto({
        transaction_type: TransactionType.Adjustment,
        quantity: 0,
      });
      await expect(svc.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('transfer quantity cannot be zero', async () => {
      const dto = makeDto({
        transaction_type: TransactionType.Transfer,
        quantity: 0,
      });
      await expect(svc.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('disposal quantity must be negative', async () => {
      const dto = makeDto({
        transaction_type: TransactionType.Disposal,
        quantity: 5,
      });
      await expect(svc.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('createMany()', () => {
    it('calls create for each dto and returns results', async () => {
      const spy = jest.spyOn(svc, 'create');
      const dtos = [makeDto(), makeDto()];
      const out = await svc.createMany(dtos);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(out).toHaveLength(2);
    });
  });
});
