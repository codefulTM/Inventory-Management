import { Test, TestingModule } from '@nestjs/testing';
import { InventoryLotService } from '../inventory-lot/inventory-lot.service';
import { InventoryLotRepository } from '../inventory-lot/inventory-lot.repository';
import { InventoryTransactionService } from '../inventory-transaction/inventory-transaction.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  CreateInventoryLotDto,
  InventoryLotStatus,
} from '../inventory-lot/inventory-lot.dto';

// Sample lot data for testing
const sampleLot: any = {
  lot_id: '550e8400-e29b-41d4-a716-446655440000',
  material_id: 'MAT-001',
  manufacturer_name: 'ABC Pharma',
  manufacturer_lot: 'LOT-2025-001',
  supplier_name: 'XYZ Suppliers',
  received_date: new Date('2025-03-01'),
  expiration_date: new Date('2027-03-01'),
  in_use_expiration_date: new Date('2026-09-01'),
  status: InventoryLotStatus.QUARANTINE,
  quantity: 1000,
  unit_of_measure: 'kg',
  storage_location: 'A1-B2-C3',
  is_sample: false,
  parent_lot_id: null,
  notes: 'Premium grade material',
  created_date: new Date('2025-03-06'),
  modified_date: new Date('2025-03-06'),
  received_by: 'operator1',
  qc_by: 'qc1',
  history: [{ action: 'QC', by: 'qc1', status: InventoryLotStatus.QUARANTINE }],
};

let service: InventoryLotService;
let repo: Record<keyof InventoryLotRepository, jest.Mock>;
let transactionService: {
  create: jest.Mock;
  getAll: jest.Mock;
  deleteByLotId: jest.Mock;
};

beforeEach(async () => {
  // Mock all repository methods
  repo = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByMaterialId: jest.fn(),
    findByStatus: jest.fn(),
    findBySampleStatus: jest.fn(),
    findSamplesByParentLot: jest.fn(),
    searchByManufacturer: jest.fn(),
    findByFilter: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    updateQuantity: jest.fn(),
    delete: jest.fn(),
    getLotsByMaterialAndStatus: jest.fn(),
    countByStatus: jest.fn(),
    checkLotExists: jest.fn(),
    findExpiringSoon: jest.fn(),
    findExpiredLots: jest.fn(),
  };

  transactionService = {
    create: jest.fn(),
    getAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    deleteByLotId: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      InventoryLotService,
      { provide: InventoryLotRepository, useValue: repo },
      { provide: InventoryTransactionService, useValue: transactionService },
    ],
  }).compile();

  service = module.get<InventoryLotService>(InventoryLotService);
});
describe('InventoryLotService', () => {});
// ==================== CREATE Tests ====================

describe('create', () => {
  it('should create a new inventory lot', async () => {
    const createDto: CreateInventoryLotDto = {
      lot_id: 'LOT-2025-001',
      material_id: 'MAT-001',
      manufacturer_name: 'ABC Pharma',
      manufacturer_lot: 'LOT-2025-001',
      received_date: new Date('2025-03-01'),
      expiration_date: new Date('2027-03-01'),
      quantity: 1000.5,
      unit_of_measure: 'kg',
      status: InventoryLotStatus.QUARANTINE,
    };

    repo.create.mockResolvedValue({ ...sampleLot, received_by: 'operator1' });
    const result = await service.create(createDto);

    expect(result.lot_id).toBe(sampleLot.lot_id);
    expect(result.status).toBe(InventoryLotStatus.QUARANTINE);
    expect(repo.create).toHaveBeenCalledWith({
      ...createDto,
      received_by: 'operator1',
    });
    expect(transactionService.create).toHaveBeenCalled();
  });

  it('should reject if received_date is after expiration_date', async () => {
    const createDto: CreateInventoryLotDto = {
      lot_id: 'LOT-2025-001',
      material_id: 'MAT-001',
      manufacturer_name: 'ABC Pharma',
      manufacturer_lot: 'LOT-2025-001',
      received_date: new Date('2028-03-01'), // received_date > expiration_date
      expiration_date: new Date('2027-03-01'),
      quantity: 1000.5,
      unit_of_measure: 'kg',
      status: InventoryLotStatus.QUARANTINE,
    };
    // Không mock repo.create, chỉ kiểm tra exception
    await expect(service.create(createDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject if quantity is 0', async () => {
    const createDto: CreateInventoryLotDto = {
      lot_id: 'LOT-2025-001',
      material_id: 'MAT-001',
      manufacturer_name: 'ABC Pharma',
      manufacturer_lot: 'LOT-2025-001',
      received_date: new Date('2025-03-01'),
      expiration_date: new Date('2027-03-01'),
      quantity: 0,
      unit_of_measure: 'kg',
      status: InventoryLotStatus.QUARANTINE,
    };

    await expect(service.create(createDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject if quantity is negative', async () => {
    const createDto: CreateInventoryLotDto = {
      lot_id: 'LOT-2025-001',
      material_id: 'MAT-001',
      manufacturer_name: 'ABC Pharma',
      manufacturer_lot: 'LOT-2025-001',
      received_date: new Date('2025-03-01'),
      expiration_date: new Date('2027-03-01'),
      quantity: -100,
      unit_of_measure: 'kg',
      status: InventoryLotStatus.QUARANTINE,
    };

    await expect(service.create(createDto)).rejects.toThrow(
      BadRequestException,
    );
  });
});

// ==================== FIND ALL Tests ====================

describe('findAll', () => {
  it('should return paginated list of inventory lots', async () => {
    const mockResponse = {
      data: [sampleLot],
      total: 45,
    };
    repo.findAll.mockResolvedValue(mockResponse);

    const result = await service.findAll(1, 10);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(45);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(repo.findAll).toHaveBeenCalledWith(1, 10);
  });

  it('should reject if page is less than 1', async () => {
    await expect(service.findAll(0, 10)).rejects.toThrow(BadRequestException);
  });

  it('should reject if limit is less than 1', async () => {
    await expect(service.findAll(1, 0)).rejects.toThrow(BadRequestException);
  });
});

// ==================== FIND BY ID Tests ====================

describe('findById', () => {
  it('should return a single inventory lot', async () => {
    repo.findById.mockResolvedValue(sampleLot);

    const result = await service.findById(sampleLot.lot_id);

    expect(result.lot_id).toBe(sampleLot.lot_id);
    expect(repo.findById).toHaveBeenCalledWith(sampleLot.lot_id);
  });

  it('should throw NotFoundException when lot does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.findById('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ==================== FIND BY MATERIAL Tests ====================

describe('findByMaterialId', () => {
  it('should return lots for a specific material', async () => {
    const mockResponse = {
      data: [sampleLot],
      total: 8,
    };
    repo.findByMaterialId.mockResolvedValue(mockResponse);

    const result = await service.findByMaterialId('MAT-001', 1, 10);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(8);
    expect(repo.findByMaterialId).toHaveBeenCalledWith('MAT-001', 1, 10);
  });
});

// ==================== FIND BY STATUS Tests ====================

describe('findByStatus', () => {
  it('should return lots with specific status', async () => {
    const mockResponse = {
      data: [sampleLot],
      total: 23,
    };
    repo.findByStatus.mockResolvedValue(mockResponse);

    const result = await service.findByStatus(
      InventoryLotStatus.ACCEPTED,
      1,
      10,
    );

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(23);
    expect(repo.findByStatus).toHaveBeenCalledWith(
      InventoryLotStatus.ACCEPTED,
      1,
      10,
    );
  });

  it('should reject invalid status', async () => {
    await expect(
      service.findByStatus('InvalidStatus' as any, 1, 10),
    ).rejects.toThrow(BadRequestException);
  });
});

// ==================== SEARCH Tests ====================

describe('searchByManufacturer', () => {
  it('should search lots by manufacturer', async () => {
    const mockResponse = {
      data: [sampleLot],
      total: 5,
    };
    repo.searchByManufacturer.mockResolvedValue(mockResponse);

    const result = await service.searchByManufacturer('ABC', 1, 10);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(5);
  });

  it('should reject query shorter than 2 characters', async () => {
    await expect(service.searchByManufacturer('A', 1, 10)).rejects.toThrow(
      BadRequestException,
    );
  });
});

// ==================== FILTER Tests ====================

describe('filterLots', () => {
  it('should filter lots by multiple criteria', async () => {
    const mockResponse = {
      data: [sampleLot],
      total: 12,
    };
    repo.findByFilter.mockResolvedValue(mockResponse);

    const filter = {
      material_id: 'MAT-001',
      status: InventoryLotStatus.ACCEPTED,
      is_sample: false,
    };
    const result = await service.filterLots(filter, 1, 10);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(12);
  });

  it('should reject invalid status in filter', async () => {
    const filter = {
      status: 'InvalidStatus' as any,
    };

    await expect(service.filterLots(filter, 1, 10)).rejects.toThrow(
      BadRequestException,
    );
  });
});

// ==================== UPDATE Tests ====================

describe('update', () => {
  it('should update lot details', async () => {
    const existingLot = { ...sampleLot };
    repo.findById.mockResolvedValue(existingLot);
    const updatedLot = { ...sampleLot, storage_location: 'A2-B3-C4' };
    repo.update.mockResolvedValue(updatedLot);

    const result = await service.update(sampleLot.lot_id, {
      ...sampleLot,
      storage_location: 'A2-B3-C4',
    });

    expect(result.storage_location).toBe('A2-B3-C4');
  });

  it('should throw NotFoundException when lot does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      service.update('non-existent-id', {
        ...sampleLot,
        storage_location: 'A2',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject if received_date is after expiration_date', async () => {
    repo.findById.mockResolvedValue(sampleLot);

    await expect(
      service.update(sampleLot.lot_id, {
        ...sampleLot,
        received_date: new Date('2027-03-01'),
        expiration_date: new Date('2025-03-01'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should auto-set status to Depleted when quantity becomes 0', async () => {
    const existingLot = { ...sampleLot };
    repo.findById.mockResolvedValue(existingLot);
    const depletedLot = {
      ...sampleLot,
      quantity: { toString: () => '0' },
      status: InventoryLotStatus.DEPLETED,
    };
    repo.update.mockResolvedValue(depletedLot);

    const result = await service.update(sampleLot.lot_id, {
      ...sampleLot,
      quantity: 0,
    });

    expect(result.status).toBe(InventoryLotStatus.DEPLETED);
  });
});

// ==================== STATUS UPDATE Tests ====================

describe('updateStatus', () => {
  it('should transition from Quarantine to Accepted', async () => {
    repo.findById.mockResolvedValue(sampleLot);
    const acceptedLot = { ...sampleLot, status: InventoryLotStatus.ACCEPTED };
    repo.updateStatus.mockResolvedValue(acceptedLot);

    const result = await service.updateStatus(
      sampleLot.lot_id,
      InventoryLotStatus.ACCEPTED,
    );

    expect(result.status).toBe(InventoryLotStatus.ACCEPTED);
  });

  it('should transition from Accepted to Depleted', async () => {
    const acceptedLot = { ...sampleLot, status: InventoryLotStatus.ACCEPTED };
    repo.findById.mockResolvedValue(acceptedLot);
    const depletedLot = {
      ...acceptedLot,
      status: InventoryLotStatus.DEPLETED,
    };
    repo.update.mockResolvedValue({ ...acceptedLot, quantity: 0 });
    repo.updateStatus.mockResolvedValue(depletedLot);

    const result = await service.updateStatus(
      sampleLot.lot_id,
      InventoryLotStatus.DEPLETED,
    );

    expect(result.status).toBe(InventoryLotStatus.DEPLETED);
    expect(repo.update).toHaveBeenCalledWith(sampleLot.lot_id, { quantity: 0 });
    expect(transactionService.create).toHaveBeenCalled();
  });

  it('should reject invalid transition from Rejected to Accepted', async () => {
    const rejectedLot = { ...sampleLot, status: InventoryLotStatus.REJECTED };
    repo.findById.mockResolvedValue(rejectedLot);

    await expect(
      service.updateStatus(sampleLot.lot_id, InventoryLotStatus.ACCEPTED),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject invalid transition from Depleted to Accepted', async () => {
    const depletedLot = { ...sampleLot, status: InventoryLotStatus.DEPLETED };
    repo.findById.mockResolvedValue(depletedLot);

    await expect(
      service.updateStatus(sampleLot.lot_id, InventoryLotStatus.ACCEPTED),
    ).rejects.toThrow(ConflictException);
  });

  it('should allow same status update', async () => {
    repo.findById.mockResolvedValue(sampleLot);
    repo.updateStatus.mockResolvedValue(sampleLot);

    const result = await service.updateStatus(
      sampleLot.lot_id,
      InventoryLotStatus.QUARANTINE,
    );

    expect(result.status).toBe(InventoryLotStatus.QUARANTINE);
  });
});

// ==================== DELETE Tests ====================

describe('delete', () => {
  it('should delete a Quarantine lot when only the initial Receipt transaction exists', async () => {
    repo.findById.mockResolvedValue(sampleLot);
    repo.delete.mockResolvedValue(sampleLot);
    transactionService.getAll.mockResolvedValue({
      items: [
        {
          transaction_type: 'Receipt',
          reference_number: `lot-create:${sampleLot.lot_id}`,
        },
      ],
      total: 1,
    });

    const result = await service.delete(sampleLot.lot_id);

    expect(result.success).toBe(true);
    expect(transactionService.deleteByLotId).toHaveBeenCalledWith(
      sampleLot.lot_id,
    );
    expect(repo.delete).toHaveBeenCalledWith(sampleLot.lot_id);
  });

  it('should reject deletion when there are additional transactions', async () => {
    repo.findById.mockResolvedValue(sampleLot);
    transactionService.getAll.mockResolvedValue({
      items: [
        {
          transaction_type: 'Receipt',
          reference_number: `lot-create:${sampleLot.lot_id}`,
        },
        {
          transaction_type: 'Usage',
          reference_number: `lot-update:${sampleLot.lot_id}`,
        },
      ],
      total: 2,
    });

    await expect(service.delete(sampleLot.lot_id)).rejects.toThrow(
      ConflictException,
    );
  });

  it('should throw NotFoundException when lot does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.delete('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should reject deletion of Accepted lot', async () => {
    const acceptedLot = { ...sampleLot, status: InventoryLotStatus.ACCEPTED };
    repo.findById.mockResolvedValue(acceptedLot);

    await expect(service.delete(sampleLot.lot_id)).rejects.toThrow(
      ConflictException,
    );
  });

  it('should reject deletion of Rejected lot', async () => {
    const rejectedLot = { ...sampleLot, status: InventoryLotStatus.REJECTED };
    repo.findById.mockResolvedValue(rejectedLot);

    await expect(service.delete(sampleLot.lot_id)).rejects.toThrow(
      ConflictException,
    );
  });

  it('should reject deletion of Depleted lot', async () => {
    const depletedLot = { ...sampleLot, status: InventoryLotStatus.DEPLETED };
    repo.findById.mockResolvedValue(depletedLot);

    await expect(service.delete(sampleLot.lot_id)).rejects.toThrow(
      ConflictException,
    );
  });
});

// ==================== SAMPLE LOT Tests ====================

describe('findSampleLots', () => {
  it('should return all sample lots', async () => {
    const sampleLot2 = { ...sampleLot, is_sample: true };
    const mockResponse = {
      data: [sampleLot2],
      total: 5,
    };
    repo.findBySampleStatus.mockResolvedValue(mockResponse);

    const result = await service.findSampleLots(1, 10);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(5);
  });
});

describe('findSamplesByParentLot', () => {
  it('should return samples from parent lot', async () => {
    const sampleFromParent = {
      ...sampleLot,
      is_sample: true,
      parent_lot_id: 'parent-id',
    };
    repo.findSamplesByParentLot.mockResolvedValue([sampleFromParent]);

    const result = await service.findSamplesByParentLot('parent-id');

    expect(result).toHaveLength(1);
    expect(result[0].parent_lot_id).toBe('parent-id');
  });
});

// ==================== EXPIRATION Tests ====================

describe('getExpiringSoon', () => {
  it('should return lots expiring within specified days', async () => {
    repo.findExpiringSoon.mockResolvedValue([sampleLot]);

    const result = await service.getExpiringSoon(30);

    expect(result).toHaveLength(1);
    expect(repo.findExpiringSoon).toHaveBeenCalledWith(30);
  });

  it('should reject if days is less than 1', async () => {
    await expect(service.getExpiringSoon(0)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject if days is greater than 365', async () => {
    await expect(service.getExpiringSoon(366)).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('getExpiredLots', () => {
  it('should return already expired lots', async () => {
    repo.findExpiredLots.mockResolvedValue([sampleLot]);

    const result = await service.getExpiredLots();

    expect(result).toHaveLength(1);
    expect(repo.findExpiredLots).toHaveBeenCalled();
  });
});

// ==================== STATISTICS Tests ====================

describe('getLotsStatistics', () => {
  it('should return statistics', async () => {
    repo.findAll.mockResolvedValue({ data: [sampleLot], total: 156 });
    repo.countByStatus.mockResolvedValue(12);
    repo.findExpiringSoon.mockResolvedValue([]);
    repo.findExpiredLots.mockResolvedValue([]);

    const result = await service.getLotsStatistics();

    expect(result.total).toBe(156);
    expect(result.byStatus).toBeDefined();
    expect(result.expiringSoon).toBe(0);
    expect(result.expired).toBe(0);
  });
});

// ==================== TRACEABILITY & AUDIT FIELDS Tests ====================

describe('traceability & audit fields', () => {
  it('should set received_by and status on create', async () => {
    const createDto: CreateInventoryLotDto = {
      lot_id: 'LOT-2025-001',
      material_id: 'MAT-001',
      manufacturer_name: 'ABC Pharma',
      manufacturer_lot: 'LOT-2025-001',
      received_date: new Date('2025-03-01'),
      expiration_date: new Date('2027-03-01'),
      quantity: 1000.5,
      unit_of_measure: 'kg',
      status: InventoryLotStatus.QUARANTINE,
      // received_by: 'operator1', // Remove if not in CreateInventoryLotDto
    };
    repo.create.mockResolvedValue({
      ...sampleLot,
      received_by: 'operator1',
      status: InventoryLotStatus.QUARANTINE,
    });
    const result = await service.create(createDto as any);
    expect(result.received_by).toBe('operator1');
    expect(result.status).toBe(InventoryLotStatus.QUARANTINE);
  });

  it('should update qc_by, status and push to history on QC', async () => {
    const updated = {
      ...sampleLot,
      qc_by: 'qc1',
      status: InventoryLotStatus.ACCEPTED,
      history: [
        { action: 'QC', by: 'qc1', status: InventoryLotStatus.ACCEPTED },
      ],
    };
    repo.findById.mockResolvedValue(sampleLot);
    repo.update.mockResolvedValue({
      ...updated,
      qc_by: 'qc1',
      status: InventoryLotStatus.ACCEPTED,
      history: [
        { action: 'QC', by: 'qc1', status: InventoryLotStatus.ACCEPTED },
      ],
    });
    const result = await service.update(sampleLot.lot_id, {
      qc_by: 'qc1',
      status: InventoryLotStatus.ACCEPTED,
    } as any);
    expect(result.qc_by).toBe('qc1');
    expect(result.status).toBe(InventoryLotStatus.ACCEPTED);
    expect(result.history).toEqual(
      expect.arrayContaining([
        { action: 'QC', by: 'qc1', status: InventoryLotStatus.ACCEPTED },
      ]),
    );
  });
});
