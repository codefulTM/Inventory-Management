import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { BinWorklistService } from './bin-worklist.service';

describe('BinWorklistService', () => {
  let svc: BinWorklistService;

  const storageLocationModelMock: any = {
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const inventoryLotRepoMock: any = {
    aggregate: jest.fn(),
    findByLotIds: jest.fn(),
  };

  const binCountRepoMock: any = {
    findByBin: jest.fn(),
    create: jest.fn(),
  };

  const materialRepoMock: any = {
    findByMaterialIds: jest.fn(),
  };

  const warehouseSlipServiceMock: any = {
    create: jest.fn(),
  };

  const auditLogServiceMock: any = {
    log: jest.fn(),
  };

  const mailServiceMock: any = {
    sendBinFlagEmail: jest.fn(),
  };

  const configServiceMock: any = {
    get: jest.fn(),
  };
  const userServiceMock: any = {
    findByRole: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    svc = new BinWorklistService(
      inventoryLotRepoMock,
      binCountRepoMock,
      materialRepoMock,
      warehouseSlipServiceMock,
      auditLogServiceMock,
      mailServiceMock,
      configServiceMock,
      userServiceMock,
      storageLocationModelMock,
    );
  });

  it('createBin throws when bin_code missing', async () => {
    await expect(svc.createBin(undefined as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('createBin upserts storage location and returns created doc', async () => {
    const created = { location_id: 'BIN-1', warehouse_id: 'WH-1' };
    storageLocationModelMock.findOneAndUpdate.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(created) }),
    });

    const res = await svc.createBin({ bin_code: 'BIN-1', expected_qty: 5 });

    expect(storageLocationModelMock.findOneAndUpdate).toHaveBeenCalled();
    expect(res).toBe(created);
  });

  it('updateBin throws when bin_code missing', async () => {
    await expect(svc.updateBin('', {} as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('updateBin sets fields and returns updated', async () => {
    const updated = { location_id: 'BIN-2', expected_qty: 7 };
    storageLocationModelMock.findOneAndUpdate.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(updated) }),
    });

    const res = await svc.updateBin('BIN-2', { expected_qty: 7 } as any);

    expect(storageLocationModelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { location_id: 'BIN-2' },
      { $set: { expected_qty: 7 } },
      { new: true },
    );
    expect(res).toBe(updated);
  });

  it('deleteBin throws when bin_code missing', async () => {
    await expect(svc.deleteBin('')).rejects.toThrow(BadRequestException);
  });

  it('deleteBin returns success true when deleted', async () => {
    storageLocationModelMock.findOneAndDelete.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve({}) }),
    });

    const res = await svc.deleteBin('BIN-DEL');
    expect(storageLocationModelMock.findOneAndDelete).toHaveBeenCalledWith({
      location_id: 'BIN-DEL',
    });
    expect(res).toEqual({ success: true });
  });

  it('getWorklist returns bins with lots and last_count_date', async () => {
    const docs = [{ location_id: 'B1', expected_qty: 10, location_name: 'B1' }];
    storageLocationModelMock.find.mockReturnValueOnce({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => ({ exec: () => Promise.resolve(docs) }),
          }),
        }),
      }),
    });
    // countDocuments returns a query; mock the chain's exec()
    storageLocationModelMock.countDocuments.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(1),
    });

    inventoryLotRepoMock.aggregate.mockResolvedValueOnce([
      { _id: 'B1', lots: [{ lot_id: 'L1', material_id: 'M1', qty: 2 }] },
    ]);

    binCountRepoMock.findByBin.mockResolvedValueOnce({
      data: [{ counted_at: new Date('2025-01-01') }],
    });

    const res = await svc.getWorklist(undefined, 1, 50);

    expect(res.total).toBe(1);
    expect(res.data[0].bin_code).toBe('B1');
    expect(res.data[0].lots).toHaveLength(1);
    expect(res.data[0].last_count_date).toBeDefined();
  });

  it('getBinDetails throws when bin_code missing', async () => {
    await expect(svc.getBinDetails('')).rejects.toThrow(BadRequestException);
  });

  it('getBinDetails returns lots from inventoryLotRepo.aggregate', async () => {
    inventoryLotRepoMock.aggregate.mockResolvedValueOnce([
      { lot_id: 'L1', material_id: 'M1', quantity: 5 },
    ]);
    const r = await svc.getBinDetails('B-DETAIL');
    expect(inventoryLotRepoMock.aggregate).toHaveBeenCalled();
    expect(r.bin_code).toBe('B-DETAIL');
    expect(r.lots).toHaveLength(1);
  });

  it('submitCounts flags review when expectedTotal is 0 and countedTotal > 0', async () => {
    inventoryLotRepoMock.aggregate.mockResolvedValueOnce([
      { _id: 'LOT-1', expected_qty: 0, material_id: 'M1' },
    ]);

    binCountRepoMock.create.mockResolvedValueOnce({
      _id: 'REC-1',
      counted_at: new Date('2025-01-02'),
    });

    configServiceMock.get.mockImplementation((k: string) => {
      if (k === 'MANAGER_EMAIL') return 'mgr@example.local';
      if (k === 'AUTO_ADJUST_BIN_COUNT') return 'true';
      return undefined;
    });

    userServiceMock.findByRole.mockResolvedValueOnce({
      data: [{ email: 'mgr@example.local' }],
    });

    const dto: any = {
      counted_by: 'user1',
      entries: [{ lot_id: 'LOT-1', material_id: 'M1', counted_qty: 3 }],
      notes: 'note',
    };

    const r = await svc.submitCounts('BIN-COUNT', dto);

    expect(binCountRepoMock.create).toHaveBeenCalled();
    expect(r.flag_review).toBe(true);
    expect(r.success).toBe(true);
    expect(mailServiceMock.sendBinFlagEmail).toHaveBeenCalledWith(
      'mgr@example.local',
      'BIN-COUNT',
      expect.any(Number),
      String('REC-1'),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('submitCounts auto-adjusts when not flagged and AUTO_ADJUST_BIN_COUNT=true', async () => {
    inventoryLotRepoMock.aggregate.mockResolvedValueOnce([
      { _id: 'LOT-2', expected_qty: 10, material_id: 'M2' },
    ]);

    binCountRepoMock.create.mockResolvedValueOnce({
      _id: 'REC-2',
      counted_at: new Date(),
    });

    inventoryLotRepoMock.findByLotIds.mockResolvedValueOnce([
      { lot_id: 'LOT-2', warehouse_id: 'WH-1', unit_of_measure: 'EA' },
    ]);

    configServiceMock.get.mockImplementation((k: string) => {
      if (k === 'AUTO_ADJUST_BIN_COUNT') return 'true';
      if (k === 'DEFAULT_WAREHOUSE_ID') return 'WH-DEF';
      return undefined;
    });

    const dto: any = {
      counted_by: 'user2',
      entries: [{ lot_id: 'LOT-2', material_id: 'M2', counted_qty: 8 }],
      notes: '',
    };

    const r = await svc.submitCounts('BIN-COUNT-2', dto);

    expect(r.flag_review).toBe(false);
    expect(warehouseSlipServiceMock.create).toHaveBeenCalledTimes(1);
  });

  it('getBinCounts returns transformed entries with material and lot info', async () => {
    binCountRepoMock.findByBin.mockResolvedValueOnce({
      data: [
        {
          _id: 'REC-X',
          bin_code: 'B-X',
          counted_by: 'u',
          counted_at: new Date('2025-03-01'),
          entries: [
            {
              lot_id: 'LOT-X',
              material_id: 'MAT-X',
              expected_qty: 10,
              counted_qty: 9,
              notes: '',
            },
          ],
          flag_review: false,
          notes: '',
        },
      ],
      total: 1,
    });

    materialRepoMock.findByMaterialIds.mockResolvedValueOnce([
      { material_id: 'MAT-X', material_name: 'Material X' },
    ]);

    inventoryLotRepoMock.findByLotIds.mockResolvedValueOnce([
      { lot_id: 'LOT-X', unit_of_measure: 'KG' },
    ]);

    const res = await svc.getBinCounts('B-X', 1, 20);

    expect(res.data[0].expected_total).toBe(10);
    expect(res.data[0].counted_total).toBe(9);
    expect(res.data[0].entries[0].material_name).toBe('Material X');
    expect(res.data[0].entries[0].unit_of_measure).toBe('KG');
  });
});
