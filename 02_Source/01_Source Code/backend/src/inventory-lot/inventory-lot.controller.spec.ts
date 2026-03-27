import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryLotController } from './inventory-lot.controller';
import { InventoryLotService } from './inventory-lot.service';
import {
  CreateInventoryLotDto,
  InventoryLotStatus,
  UpdateInventoryLotDto,
} from './inventory-lot.dto';

jest.mock(
  'src/inventory-lot/inventory-lot.dto',
  () => ({
    InventoryLotStatus: {
      QUARANTINE: 'Quarantine',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
      DEPLETED: 'Depleted',
    },
  }),
  { virtual: true },
);

type MockedInventoryLotService = {
  create: jest.Mock;
  findAll: jest.Mock;
  getLotsStatistics: jest.Mock;
  getExpiringSoon: jest.Mock;
  getExpiredLots: jest.Mock;
  findSampleLots: jest.Mock;
  searchByManufacturer: jest.Mock;
  filterLots: jest.Mock;
  findByMaterialId: jest.Mock;
  findByStatus: jest.Mock;
  findSamplesByParentLot: jest.Mock;
  findById: jest.Mock;
  update: jest.Mock;
  updateStatus: jest.Mock;
  delete: jest.Mock;
};

describe('InventoryLotController', () => {
  let controller: InventoryLotController;
  let service: MockedInventoryLotService;

  const sampleResponse = {
    lot_id: 'LOT-001',
    material_id: 'MAT-001',
    manufacturer_name: 'ABC Pharma',
    manufacturer_lot: 'MFG-LOT-001',
    received_date: new Date('2025-01-01T00:00:00.000Z'),
    expiration_date: new Date('2026-01-01T00:00:00.000Z'),
    status: InventoryLotStatus.QUARANTINE,
    quantity: 100,
    unit_of_measure: 'kg',
    is_sample: false,
    created_date: new Date('2025-01-01T10:00:00.000Z'),
    modified_date: new Date('2025-01-01T10:00:00.000Z'),
  };

  beforeEach(async () => {
    const serviceMock: MockedInventoryLotService = {
      create: jest.fn(),
      findAll: jest.fn(),
      getLotsStatistics: jest.fn(),
      getExpiringSoon: jest.fn(),
      getExpiredLots: jest.fn(),
      findSampleLots: jest.fn(),
      searchByManufacturer: jest.fn(),
      filterLots: jest.fn(),
      findByMaterialId: jest.fn(),
      findByStatus: jest.fn(),
      findSamplesByParentLot: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryLotController],
      providers: [
        {
          provide: InventoryLotService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<InventoryLotController>(InventoryLotController);
    service = module.get<MockedInventoryLotService>(InventoryLotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should pass dto to service.create', async () => {
      const dto: CreateInventoryLotDto = {
        lot_id: 'LOT-001',
        material_id: 'MAT-001',
        manufacturer_name: 'ABC Pharma',
        manufacturer_lot: 'MFG-LOT-001',
        received_date: new Date('2025-01-01T00:00:00.000Z'),
        expiration_date: new Date('2026-01-01T00:00:00.000Z'),
        status: InventoryLotStatus.QUARANTINE,
        quantity: 100,
        unit_of_measure: 'kg',
      };
      service.create.mockResolvedValue(sampleResponse);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(sampleResponse);
    });
  });

  describe('findAll', () => {
    it('should parse query params and call service.findAll', async () => {
      service.findAll.mockResolvedValue({
        data: [sampleResponse],
        total: 1,
        page: 2,
        limit: 5,
      });

      const result = await controller.findAll('2', '5');

      expect(service.findAll).toHaveBeenCalledWith(2, 5);
      expect(result.total).toBe(1);
    });

    it('should use default pagination when params are omitted', async () => {
      service.findAll.mockResolvedValue({
        data: [sampleResponse],
        total: 1,
        page: 1,
        limit: 10,
      });

      await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('statistics and expiry endpoints', () => {
    it('should return statistics', async () => {
      service.getLotsStatistics.mockResolvedValue({
        total: 10,
        byStatus: { Quarantine: 10 },
        expiringSoon: 2,
        expired: 1,
      });

      const result = await controller.getStatistics();

      expect(service.getLotsStatistics).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(10);
    });

    it('should parse days for expiring-soon endpoint', async () => {
      service.getExpiringSoon.mockResolvedValue([sampleResponse]);

      const result = await controller.getExpiringSoon('45');

      expect(service.getExpiringSoon).toHaveBeenCalledWith(45);
      expect(result).toHaveLength(1);
    });

    it('should use default days when omitted', async () => {
      service.getExpiringSoon.mockResolvedValue([sampleResponse]);

      await controller.getExpiringSoon();

      expect(service.getExpiringSoon).toHaveBeenCalledWith(30);
    });

    it('should return expired lots from service', async () => {
      service.getExpiredLots.mockResolvedValue([sampleResponse]);

      const result = await controller.getExpiredLots();

      expect(service.getExpiredLots).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('sample and search endpoints', () => {
    it('should call findSampleLots with parsed pagination', async () => {
      service.findSampleLots.mockResolvedValue({
        data: [sampleResponse],
        total: 1,
        page: 3,
        limit: 2,
      });

      const result = await controller.findSampleLots('3', '2');

      expect(service.findSampleLots).toHaveBeenCalledWith(3, 2);
      expect(result.page).toBe(3);
    });

    it('should return empty payload when query is missing', async () => {
      const result = await controller.search(
        undefined as unknown as string,
        '2',
        '7',
      );

      expect(service.searchByManufacturer).not.toHaveBeenCalled();
      expect(result).toEqual({ data: [], total: 0, page: 1, limit: '7' });
    });

    it('should call service.searchByManufacturer with parsed pagination', async () => {
      service.searchByManufacturer.mockResolvedValue({
        data: [sampleResponse],
        total: 4,
        page: 2,
        limit: 2,
      });

      const result = await controller.search('ABC', '2', '2');

      expect(service.searchByManufacturer).toHaveBeenCalledWith('ABC', 2, 2);
      expect(result.total).toBe(4);
    });
  });

  describe('filter', () => {
    it('should build filter object from query params', async () => {
      service.filterLots.mockResolvedValue({
        data: [sampleResponse],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await controller.filter(
        'MAT-001',
        InventoryLotStatus.QUARANTINE,
        'true',
        'ABC',
        '1',
        '10',
      );

      expect(service.filterLots).toHaveBeenCalledWith(
        {
          material_id: 'MAT-001',
          status: InventoryLotStatus.QUARANTINE,
          is_sample: true,
          manufacturer_name: 'ABC',
        },
        1,
        10,
      );
      expect(result.total).toBe(1);
    });

    it('should pass empty filter when no criteria are provided', async () => {
      service.filterLots.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await controller.filter(
        undefined,
        undefined,
        undefined,
        undefined,
        '1',
        '10',
      );

      expect(service.filterLots).toHaveBeenCalledWith({}, 1, 10);
    });

    it.each([
      { isSample: 'false', expected: false },
      { isSample: 'true', expected: true },
    ])(
      'should parse is_sample value "$isSample" to $expected',
      async ({ isSample, expected }) => {
        service.filterLots.mockResolvedValue({
          data: [],
          total: 0,
          page: 1,
          limit: 10,
        });

        await controller.filter(
          undefined,
          undefined,
          isSample,
          undefined,
          '1',
          '10',
        );

        expect(service.filterLots).toHaveBeenCalledWith(
          expect.objectContaining({ is_sample: expected }),
          1,
          10,
        );
      },
    );
  });

  describe('material/status/parent lookups', () => {
    it('should call findByMaterialId with parsed paging', async () => {
      service.findByMaterialId.mockResolvedValue({
        data: [sampleResponse],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await controller.findByMaterialId('MAT-001', '1', '10');

      expect(service.findByMaterialId).toHaveBeenCalledWith('MAT-001', 1, 10);
      expect(result.total).toBe(1);
    });

    it('should call findByStatus via findAll when status query is provided', async () => {
      service.findByStatus.mockResolvedValue({
        data: [sampleResponse],
        total: 1,
        page: 1,
        limit: 10,
      });

      await controller.findAll('2', '3', InventoryLotStatus.ACCEPTED);

      expect(service.findByStatus).toHaveBeenCalledWith(
        InventoryLotStatus.ACCEPTED,
        2,
        3,
      );
    });

    it('should call findSamplesByParentLot', async () => {
      service.findSamplesByParentLot.mockResolvedValue([
        {
          ...sampleResponse,
          is_sample: true,
          parent_lot_id: 'LOT-PARENT-1',
        },
      ]);

      const result = await controller.findSamplesByParentLot('LOT-PARENT-1');

      expect(service.findSamplesByParentLot).toHaveBeenCalledWith(
        'LOT-PARENT-1',
      );
      expect(result[0]?.parent_lot_id).toBe('LOT-PARENT-1');
    });
  });

  describe('findOne/update/updateStatus/remove', () => {
    it('should call findById', async () => {
      service.findById.mockResolvedValue(sampleResponse);

      const result = await controller.findOne('LOT-001');

      expect(service.findById).toHaveBeenCalledWith('LOT-001');
      expect(result.lot_id).toBe('LOT-001');
    });

    it('should call update with id and dto', async () => {
      const dto: UpdateInventoryLotDto = {
        material_id: 'MAT-001',
        manufacturer_name: 'ABC Pharma',
        manufacturer_lot: 'MFG-LOT-001',
        received_date: new Date('2025-01-01T00:00:00.000Z'),
        expiration_date: new Date('2026-01-01T00:00:00.000Z'),
        status: InventoryLotStatus.ACCEPTED,
        quantity: 100,
        unit_of_measure: 'kg',
      };
      service.update.mockResolvedValue({
        ...sampleResponse,
        status: InventoryLotStatus.ACCEPTED,
      });

      const result = await controller.update('LOT-001', dto);

      expect(service.update).toHaveBeenCalledWith('LOT-001', dto);
      expect(result.status).toBe(InventoryLotStatus.ACCEPTED);
    });

    it('should call updateStatus', async () => {
      service.updateStatus.mockResolvedValue({
        ...sampleResponse,
        status: InventoryLotStatus.ACCEPTED,
      });

      const result = await controller.updateStatus(
        'LOT-001',
        InventoryLotStatus.ACCEPTED,
      );

      expect(service.updateStatus).toHaveBeenCalledWith(
        'LOT-001',
        InventoryLotStatus.ACCEPTED,
      );
      expect(result.status).toBe(InventoryLotStatus.ACCEPTED);
    });

    it('should call delete on remove endpoint', async () => {
      service.delete.mockResolvedValue({
        success: true,
        message: 'Inventory lot LOT-001 deleted successfully',
      });

      const result = await controller.remove('LOT-001');

      expect(service.delete).toHaveBeenCalledWith('LOT-001');
      expect(result.success).toBe(true);
    });
  });
});
