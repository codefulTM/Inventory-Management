import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InventoryTransactionService } from './inventory-transaction.service';
import { InventoryTransactionRepository } from './inventory-transaction.repository';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';

describe('InventoryTransactionService', () => {
  let service: InventoryTransactionService;
  let repository: InventoryTransactionRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryTransactionService,
        {
          provide: InventoryTransactionRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findByLotId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryTransactionService>(InventoryTransactionService);
    repository = module.get<InventoryTransactionRepository>(InventoryTransactionRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a valid Receipt transaction', async () => {
      const dto: CreateInventoryTransactionDto = {
        lot_id: '507f1f77bcf86cd799439011',
        material_id: '507f1f77bcf86cd799439012',
        transaction_type: 'Receipt',
        quantity: 100,
        unit_of_measure: 'kg',
        transaction_date: new Date(),
        reference_number: 'PO-001',
        performed_by: '507f1f77bcf86cd799439013',
        notes: 'Test receipt',
      };

      const mockResult = {
        _id: '507f1f77bcf86cd799439014',
        transaction_id: 'abc-123',
        ...dto,
        created_date: new Date(),
        modified_date: new Date(),
      };

      jest.spyOn(repository, 'create').mockResolvedValue(mockResult);

      const result = await service.create(dto);

      expect(result).toEqual(mockResult);
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining(dto));
    });

    it('should create a valid Usage transaction', async () => {
      const dto: CreateInventoryTransactionDto = {
        lot_id: '507f1f77bcf86cd799439011',
        material_id: '507f1f77bcf86cd799439012',
        transaction_type: 'Usage',
        quantity: 50,
        unit_of_measure: 'kg',
        transaction_date: new Date(),
        reference_number: 'BATCH-001',
        performed_by: '507f1f77bcf86cd799439013',
        notes: 'Test usage',
      };

      const mockResult = {
        _id: '507f1f77bcf86cd799439014',
        transaction_id: 'xyz-789',
        ...dto,
        created_date: new Date(),
        modified_date: new Date(),
      };

      jest.spyOn(repository, 'create').mockResolvedValue(mockResult);

      const result = await service.create(dto);

      expect(result).toEqual(mockResult);
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for negative quantity', async () => {
      const dto: CreateInventoryTransactionDto = {
        lot_id: '507f1f77bcf86cd799439011',
        material_id: '507f1f77bcf86cd799439012',
        transaction_type: 'Receipt',
        quantity: -10,
        unit_of_measure: 'kg',
        transaction_date: new Date(),
        performed_by: '507f1f77bcf86cd799439013',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for zero quantity', async () => {
      const dto: CreateInventoryTransactionDto = {
        lot_id: '507f1f77bcf86cd799439011',
        material_id: '507f1f77bcf86cd799439012',
        transaction_type: 'Receipt',
        quantity: 0,
        unit_of_measure: 'kg',
        transaction_date: new Date(),
        performed_by: '507f1f77bcf86cd799439013',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing lot_id', async () => {
      const dto: CreateInventoryTransactionDto = {
        lot_id: '',
        material_id: '507f1f77bcf86cd799439012',
        transaction_type: 'Receipt',
        quantity: 100,
        unit_of_measure: 'kg',
        transaction_date: new Date(),
        performed_by: '507f1f77bcf86cd799439013',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid transaction_type', async () => {
      const dto = {
        lot_id: '507f1f77bcf86cd799439011',
        material_id: '507f1f77bcf86cd799439012',
        transaction_type: 'Invalid',
        quantity: 100,
        unit_of_measure: 'kg',
        transaction_date: new Date(),
        performed_by: '507f1f77bcf86cd799439013',
      } as CreateInventoryTransactionDto;

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated transactions without filters', async () => {
      const mockResult = {
        data: [
          {
            _id: '507f1f77bcf86cd799439014',
            transaction_id: 'abc-123',
            lot_id: '507f1f77bcf86cd799439011',
            material_id: '507f1f77bcf86cd799439012',
            transaction_type: 'Receipt',
            quantity: 100,
            unit_of_measure: 'kg',
            transaction_date: new Date(),
            performed_by: '507f1f77bcf86cd799439013',
            created_date: new Date(),
            modified_date: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      };

      jest.spyOn(repository, 'findAll').mockResolvedValue(mockResult);

      const result = await service.findAll({}, 1, 20);

      expect(result).toEqual(mockResult);
      expect(repository.findAll).toHaveBeenCalledWith({}, 1, 20);
    });

    it('should return filtered transactions by lot_id', async () => {
      const mockResult = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      };

      jest.spyOn(repository, 'findAll').mockResolvedValue(mockResult);

      const result = await service.findAll({ lot_id: '507f1f77bcf86cd799439011' }, 1, 20);

      expect(result).toEqual(mockResult);
      expect(repository.findAll).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid page', async () => {
      await expect(service.findAll({}, 0, 20)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid limit', async () => {
      await expect(service.findAll({}, 1, 101)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByLotId', () => {
    it('should return transactions for a specific lot', async () => {
      const mockResult = [];

      jest.spyOn(repository, 'findByLotId').mockResolvedValue(mockResult);

      const result = await service.findByLotId('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockResult);
      expect(repository.findByLotId).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should throw BadRequestException for missing lotId', async () => {
      await expect(service.findByLotId('')).rejects.toThrow(BadRequestException);
    });
  });
});
