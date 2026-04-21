import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

jest.mock('uuid', () => ({
  v4: () => '11111111-1111-4111-8111-111111111111',
}));

jest.mock('../schemas/user.schema', () => ({
  UserRole: {
    MANAGER: 'Manager',
    OPERATOR: 'Operator',
    QC_TECHNICIAN: 'Quality Control Technician',
    IT_ADMINISTRATOR: 'IT Administrator',
  },
}));

import { UserRole } from '../schemas/user.schema';
import {
  ImportExportOrderStatus,
  ImportExportOrderType,
} from '../schemas/import-export-order.schema';
import { ImportExportOrderService } from './import-export-order.service';
import { ImportExportOrderRepository } from './import-export-order.repository';

describe('ImportExportOrderService', () => {
  let service: ImportExportOrderService;
  let repo: jest.Mocked<
    Pick<
      ImportExportOrderRepository,
      | 'create'
      | 'findAll'
      | 'findOneByOrderId'
      | 'updateByOrderId'
      | 'appendAttachment'
      | 'findLotByLotId'
      | 'findLotByManufacturerLot'
      | 'findMaterialByMaterialId'
      | 'findMaterialByPartNumber'
      | 'findWarehouseById'
      | 'findStorageLocationById'
      | 'reserveNextLotId'
      | 'createProvisionalInboundLot'
      | 'runInTransaction'
      | 'increaseLotQuantity'
      | 'decreaseLotQuantityIfEnough'
      | 'updateLotStatus'
      | 'createInventoryTransactions'
      | 'updatePendingByOrderId'
    >
  >;

  const requesterOperator = {
    actor: 'operator01',
    role: UserRole.OPERATOR,
  };

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOneByOrderId: jest.fn(),
      updateByOrderId: jest.fn(),
      appendAttachment: jest.fn(),
      findLotByLotId: jest.fn(),
      findLotByManufacturerLot: jest.fn(),
      findMaterialByMaterialId: jest.fn(),
      findMaterialByPartNumber: jest.fn(),
      findWarehouseById: jest.fn(),
      findStorageLocationById: jest.fn(),
      reserveNextLotId: jest.fn(),
      createProvisionalInboundLot: jest.fn(),
      runInTransaction: jest.fn(
        async <T>(work: (session: any) => Promise<T>): Promise<T> =>
          work({} as any),
      ) as any,
      increaseLotQuantity: jest.fn(),
      decreaseLotQuantityIfEnough: jest.fn(),
      updateLotStatus: jest.fn(),
      createInventoryTransactions: jest.fn(),
      updatePendingByOrderId: jest.fn(),
    };

    service = new ImportExportOrderService(repo as any, { nextId: jest.fn().mockResolvedValue('ORD-1') } as any);
  });

  it('create sets status PendingConfirmation and created_by from requester', async () => {
    const dto = {
      order_type: ImportExportOrderType.INBOUND,
      warehouse_id: 'WH-01',
      items: [
        {
          material_id: 'MAT-001',
          quantity: 5,
          unit_of_measure: 'pcs',
          expected_location: 'COLD-STORE-A1',
        },
      ],
    };

    repo.create.mockImplementation(async (payload) => payload as any);
    repo.findMaterialByMaterialId.mockResolvedValue({
      material_id: 'MAT-001',
      material_name: 'Acetone',
    } as any);
    repo.findWarehouseById.mockResolvedValue({
      warehouse_id: 'WH-01',
      is_active: true,
    } as any);
    repo.findStorageLocationById.mockResolvedValue({
      location_id: 'COLD-STORE-A1',
      warehouse_id: 'WH-01',
      is_active: true,
    } as any);
    repo.reserveNextLotId.mockResolvedValue('LOT-020');

    const created = await service.create(dto as any, requesterOperator);

    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(created.status).toBe(ImportExportOrderStatus.PENDING_CONFIRMATION);
    expect(created.created_by).toBe('operator01');
  });

  it('create throws when item quantity <= 0', async () => {
    const dto = {
      order_type: ImportExportOrderType.OUTBOUND,
      warehouse_id: 'WH-01',
      items: [
        {
          material_id: 'MAT-001',
          quantity: 0,
          unit_of_measure: 'pcs',
        },
      ],
    };

    await expect(
      service.create(dto as any, requesterOperator),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('getOne blocks operator from accessing another user order', async () => {
    repo.findOneByOrderId.mockResolvedValue({
      order_id: '11111111-1111-4111-8111-111111111111',
      created_by: 'other-user',
    } as any);

    await expect(
      service.getOne('11111111-1111-4111-8111-111111111111', requesterOperator),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('addAttachment rejects when order is not pending', async () => {
    repo.findOneByOrderId.mockResolvedValue({
      order_id: '11111111-1111-4111-8111-111111111111',
      created_by: requesterOperator.actor,
      status: ImportExportOrderStatus.CONFIRMED,
      attachments: [],
    } as any);

    await expect(
      service.addAttachment(
        '11111111-1111-4111-8111-111111111111',
        {
          originalname: 'invoice.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          filename: 'file-a',
        },
        requesterOperator,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repo.appendAttachment).not.toHaveBeenCalled();
  });

  it('resolveScanCode resolves by lot_id and returns warning for rejected lot', async () => {
    repo.findLotByLotId.mockResolvedValue({
      lot_id: 'LOT-001',
      material_id: 'MAT-001',
      manufacturer_lot: 'MLOT-001',
      unit_of_measure: 'kg',
      storage_location: 'A-01',
      status: 'Rejected',
      quantity: 12,
    } as any);
    repo.findMaterialByMaterialId.mockResolvedValue({
      material_id: 'MAT-001',
      material_name: 'Acetone',
    } as any);

    const result = await service.resolveScanCode('LOT-001', requesterOperator);

    expect(result.resolved).toBe(true);
    expect(result.matched_by).toBe('lot_id');
    expect(result.item?.material_id).toBe('MAT-001');
    expect(result.warnings.length).toBe(1);
  });

  it('resolveScanCode returns resolved=false when no match', async () => {
    repo.findLotByLotId.mockResolvedValue(null);
    repo.findLotByManufacturerLot.mockResolvedValue(null);
    repo.findMaterialByMaterialId.mockResolvedValue(null);
    repo.findMaterialByPartNumber.mockResolvedValue(null);

    const result = await service.resolveScanCode(
      'UNKNOWN-CODE',
      requesterOperator,
    );

    expect(result.resolved).toBe(false);
    expect(result.item).toBeNull();
    expect(result.matched_by).toBeNull();
  });

  it('getWorklist forces PendingConfirmation and actor filter for operator', async () => {
    repo.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    await service.getWorklist(
      {
        order_type: ImportExportOrderType.OUTBOUND,
      },
      { page: 1, limit: 20 },
      requesterOperator,
    );

    expect(repo.findAll).toHaveBeenCalledWith(
      {
        order_type: ImportExportOrderType.OUTBOUND,
        status: ImportExportOrderStatus.PENDING_CONFIRMATION,
        created_by: requesterOperator.actor,
      },
      { page: 1, limit: 20 },
    );
  });

  it('confirm inbound updates stock and creates receipt transaction', async () => {
    repo.findOneByOrderId.mockResolvedValue({
      order_id: '11111111-1111-4111-8111-111111111111',
      order_type: ImportExportOrderType.INBOUND,
      status: ImportExportOrderStatus.PENDING_CONFIRMATION,
      created_by: requesterOperator.actor,
      blind_count_required: true,
      items: [
        {
          material_id: 'MAT-001',
          lot_id: '22222222-2222-4222-8222-222222222222',
          quantity: 5,
          unit_of_measure: 'kg',
        },
      ],
    } as any);

    repo.findLotByLotId.mockResolvedValue({
      lot_id: '22222222-2222-4222-8222-222222222222',
      material_id: 'MAT-001',
      unit_of_measure: 'kg',
      quantity: 10,
      status: 'Accepted',
    } as any);
    repo.increaseLotQuantity.mockResolvedValue({
      lot_id: '22222222-2222-4222-8222-222222222222',
      quantity: 15,
      status: 'Accepted',
    } as any);
    repo.createInventoryTransactions.mockResolvedValue([] as any);
    repo.updatePendingByOrderId.mockResolvedValue({
      order_id: '11111111-1111-4111-8111-111111111111',
      status: ImportExportOrderStatus.CONFIRMED,
    } as any);

    const result = await service.confirm(
      '11111111-1111-4111-8111-111111111111',
      {
        confirmed_items: [
          {
            material_id: 'MAT-001',
            lot_id: '22222222-2222-4222-8222-222222222222',
            expected_quantity: 5,
            actual_quantity: 5,
            unit_of_measure: 'kg',
          },
        ],
        confirm_note: 'ok',
      },
      requesterOperator,
    );

    expect(repo.runInTransaction).toHaveBeenCalled();
    expect(repo.increaseLotQuantity).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      5,
      expect.anything(),
    );
    expect(repo.createInventoryTransactions).toHaveBeenCalledTimes(1);
    expect(repo.createInventoryTransactions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          lot_id: '22222222-2222-4222-8222-222222222222',
          transaction_type: 'Receipt',
          quantity: 5,
          reference_number: '11111111-1111-4111-8111-111111111111',
          performed_by: requesterOperator.actor,
        }),
      ]),
      expect.anything(),
    );
    expect(result.status).toBe(ImportExportOrderStatus.CONFIRMED);
  });

  it('confirm outbound throws Conflict when stock is insufficient', async () => {
    repo.findOneByOrderId.mockResolvedValue({
      order_id: '11111111-1111-4111-8111-111111111111',
      order_type: ImportExportOrderType.OUTBOUND,
      status: ImportExportOrderStatus.PENDING_CONFIRMATION,
      created_by: requesterOperator.actor,
      blind_count_required: true,
      items: [
        {
          material_id: 'MAT-001',
          lot_id: '22222222-2222-4222-8222-222222222222',
          quantity: 10,
          unit_of_measure: 'kg',
        },
      ],
    } as any);

    repo.findLotByLotId.mockResolvedValue({
      lot_id: '22222222-2222-4222-8222-222222222222',
      material_id: 'MAT-001',
      unit_of_measure: 'kg',
      quantity: 3,
      status: 'Accepted',
    } as any);
    repo.decreaseLotQuantityIfEnough.mockResolvedValue(null);

    await expect(
      service.confirm(
        '11111111-1111-4111-8111-111111111111',
        {
          confirmed_items: [
            {
              material_id: 'MAT-001',
              lot_id: '22222222-2222-4222-8222-222222222222',
              expected_quantity: 10,
              actual_quantity: 10,
              unit_of_measure: 'kg',
            },
          ],
        },
        requesterOperator,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repo.updatePendingByOrderId).not.toHaveBeenCalled();
  });

  it('confirm throws BadRequest when confirmed_items do not fully match order', async () => {
    repo.findOneByOrderId.mockResolvedValue({
      order_id: '11111111-1111-4111-8111-111111111111',
      order_type: ImportExportOrderType.INBOUND,
      status: ImportExportOrderStatus.PENDING_CONFIRMATION,
      created_by: requesterOperator.actor,
      blind_count_required: true,
      items: [
        {
          material_id: 'MAT-001',
          lot_id: '22222222-2222-4222-8222-222222222222',
          quantity: 5,
          unit_of_measure: 'kg',
        },
      ],
    } as any);

    await expect(
      service.confirm(
        '11111111-1111-4111-8111-111111111111',
        {
          confirmed_items: [
            {
              material_id: 'MAT-001',
              lot_id: '22222222-2222-4222-8222-222222222222',
              expected_quantity: 4,
              actual_quantity: 4,
              unit_of_measure: 'kg',
            },
          ],
        },
        requesterOperator,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repo.runInTransaction).not.toHaveBeenCalled();
  });

  it('confirm blocks operator from confirming another user order', async () => {
    repo.findOneByOrderId.mockResolvedValue({
      order_id: '11111111-1111-4111-8111-111111111111',
      order_type: ImportExportOrderType.INBOUND,
      status: ImportExportOrderStatus.PENDING_CONFIRMATION,
      created_by: 'other-user',
      blind_count_required: true,
      items: [
        {
          material_id: 'MAT-001',
          lot_id: '22222222-2222-4222-8222-222222222222',
          quantity: 5,
          unit_of_measure: 'kg',
        },
      ],
    } as any);

    await expect(
      service.confirm(
        '11111111-1111-4111-8111-111111111111',
        {
          confirmed_items: [
            {
              material_id: 'MAT-001',
              lot_id: '22222222-2222-4222-8222-222222222222',
              expected_quantity: 5,
              actual_quantity: 5,
              unit_of_measure: 'kg',
            },
          ],
        },
        requesterOperator,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reject updates order to Rejected with reason note', async () => {
    repo.findOneByOrderId.mockResolvedValue({
      order_id: '11111111-1111-4111-8111-111111111111',
      order_type: ImportExportOrderType.OUTBOUND,
      status: ImportExportOrderStatus.PENDING_CONFIRMATION,
      created_by: requesterOperator.actor,
      blind_count_required: true,
      items: [],
    } as any);
    repo.updatePendingByOrderId.mockResolvedValue({
      order_id: '11111111-1111-4111-8111-111111111111',
      status: ImportExportOrderStatus.REJECTED,
      confirm_note: 'Mismatched lot',
    } as any);

    const rejected = await service.reject(
      '11111111-1111-4111-8111-111111111111',
      { reason: 'Mismatched lot' },
      requesterOperator,
    );

    expect(repo.updatePendingByOrderId).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      expect.objectContaining({
        status: ImportExportOrderStatus.REJECTED,
        confirm_note: 'Mismatched lot',
      }),
      expect.anything(),
    );
    expect(rejected.status).toBe(ImportExportOrderStatus.REJECTED);
  });

  it('reject throws Conflict when order already processed', async () => {
    repo.findOneByOrderId.mockResolvedValue({
      order_id: '11111111-1111-4111-8111-111111111111',
      order_type: ImportExportOrderType.OUTBOUND,
      status: ImportExportOrderStatus.CONFIRMED,
      created_by: requesterOperator.actor,
      blind_count_required: true,
      items: [],
    } as any);

    await expect(
      service.reject(
        '11111111-1111-4111-8111-111111111111',
        { reason: 'duplicate action' },
        requesterOperator,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repo.runInTransaction).not.toHaveBeenCalled();
  });
});
