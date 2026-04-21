import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InventoryTransactionService } from '../inventory-transaction/inventory-transaction.service';
import { InventoryTransactionRepository } from '../inventory-transaction/inventory-transaction.repository';
import {
  CreateInventoryTransactionDto,
  TransactionType,
} from '../inventory-transaction/dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from '../inventory-transaction/dto/update-inventory-transaction.dto';

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
      findOne: jest.fn().mockResolvedValue({ _id: 'id', lot_id: 'lot1' }),
      findMyHistory: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findOneByTransactionIdAndActor: jest.fn().mockResolvedValue(null),
      findOneByTransactionId: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((dto) => Promise.resolve({ ...dto, _id: '123' })),
      update: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(null),
    };
    svc = new InventoryTransactionService(repo as any, { nextId: jest.fn().mockResolvedValue('TXN-1') } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

    it('getMyHistory delegates with actor scope', async () => {
      const filters = {
        transaction_type: TransactionType.Receipt,
        keyword: 'MAT-001',
      };
      const paging = { page: 1, limit: 20 };
      await svc.getMyHistory(filters, paging, 'operator1');

      expect(repo.findMyHistory).toHaveBeenCalledWith(
        'operator1',
        filters,
        paging,
      );
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

    it('assigns transaction_date and transaction_id when missing', async () => {
      const dto = makeDto({ transaction_date: undefined });
      const created = await svc.create(dto);
      expect(repo.create).toHaveBeenCalled();
      const calledArg = (repo.create as jest.Mock).mock.calls[0][0];
      expect(calledArg.transaction_id).toBeDefined();
      expect(typeof calledArg.transaction_date).toBe('string');
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

  describe('getMyHistoryDetail()', () => {
    it('returns transaction when actor owns it', async () => {
      const item = { transaction_id: '4f4c5f0b-1111-4222-8333-123456789abc' };
      (repo.findOneByTransactionIdAndActor as jest.Mock).mockResolvedValueOnce(
        item,
      );

      await expect(
        svc.getMyHistoryDetail(item.transaction_id, 'operator1'),
      ).resolves.toEqual(item);
    });

    it('throws NotFoundException when transaction is missing', async () => {
      await expect(
        svc.getMyHistoryDetail(
          '4f4c5f0b-1111-4222-8333-123456789abc',
          'operator1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when transaction belongs to another actor', async () => {
      const transactionId = '4f4c5f0b-1111-4222-8333-123456789abc';
      (repo.findOneByTransactionIdAndActor as jest.Mock).mockResolvedValueOnce(
        null,
      );
      (repo.findOneByTransactionId as jest.Mock).mockResolvedValueOnce({
        transaction_id: transactionId,
        performed_by: 'another-user',
      });

      await expect(
        svc.getMyHistoryDetail(transactionId, 'operator1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
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
