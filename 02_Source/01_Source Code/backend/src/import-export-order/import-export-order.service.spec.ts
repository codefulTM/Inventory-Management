import { BadRequestException, ForbiddenException } from '@nestjs/common';

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
    };

    service = new ImportExportOrderService(repo as any);
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
        },
      ],
    };

    repo.create.mockImplementation(async (payload) => payload as any);

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
});
