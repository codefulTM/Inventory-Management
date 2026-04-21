import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateImportExportOrderDto } from './dto/create-import-export-order.dto';
import { ConfirmImportExportOrderDto } from './dto/confirm-import-export-order.dto';
import { RejectImportExportOrderDto } from './dto/reject-import-export-order.dto';
import { UpdateImportExportOrderDto } from './dto/update-import-export-order.dto';
import {
  ImportExportOrderFilterOptions,
  InventoryLotOptionsQuery,
  InventoryTransactionCreatePayload,
  MaterialOptionsQuery,
  StorageLocationOptionsQuery,
  WarehouseOptionsQuery,
  ImportExportOrderPaginationOptions,
  ImportExportOrderRepository,
} from './import-export-order.repository';
import {
  ImportExportAttachmentSource,
  ImportExportOrderAttachment,
  ImportExportOrder,
  ImportExportOrderStatus,
  ImportExportOrderType,
} from '../schemas/import-export-order.schema';
import { InventoryLotStatus } from '../inventory-lot/inventory-lot.dto';
import { TransactionType } from '../inventory-transaction/dto/create-inventory-transaction.dto';
import { UserRole } from '../schemas/user.schema';
import { RedisIdService } from '../redis-id/redis-id.service';

interface RequesterContext {
  actor: string;
  role?: UserRole;
}

type ScanMatchedBy =
  | 'lot_id'
  | 'manufacturer_lot'
  | 'material_id'
  | 'part_number';

interface ScanResolvedItem {
  material_id: string;
  lot_id: string | null;
  material_name: string | null;
  unit_of_measure: string | null;
  expected_location: string | null;
  warehouse_id: string | null;
}

interface ScanResolvedLotSnapshot {
  status: string;
  quantity: number;
  manufacturer_lot: string;
}

export interface ResolveImportExportOrderScanResult {
  scan_code: string;
  resolved: boolean;
  matched_by: ScanMatchedBy | null;
  item: ScanResolvedItem | null;
  lot: ScanResolvedLotSnapshot | null;
  warnings: string[];
  message?: string;
}

@Injectable()
export class ImportExportOrderService {
  private readonly logger = new Logger(ImportExportOrderService.name);

  constructor(
    private readonly repo: ImportExportOrderRepository,
    private readonly redisIdService: RedisIdService,
  ) {}

  async create(dto: CreateImportExportOrderDto, requester: RequesterContext) {
    this.validateItemsQuantity(dto.items);

    await this.ensureWarehouseExists(dto.warehouse_id);

    const normalizedItems = await this.normalizeItemsForOrderType(
      dto.items,
      dto.order_type,
      dto.warehouse_id,
      true,
    );

    const payload = {
      ...dto,
      items: normalizedItems,
      order_id: await this.redisIdService.nextId('ORD'),
      status: ImportExportOrderStatus.PENDING_CONFIRMATION,
      created_by: requester.actor,
      attachments: dto.attachments ?? [],
    };

    const created = await this.repo.create(payload);
    this.logger.log(
      `[import-export-order] create order_id=${created.order_id} actor=${requester.actor} role=${requester.role ?? 'unknown'} status=${created.status}`,
    );
    return created;
  }

  async getMaterialOptions(query: MaterialOptionsQuery = {}) {
    return this.repo.findMaterialOptions(query);
  }

  async getInventoryLotOptions(query: InventoryLotOptionsQuery = {}) {
    return this.repo.findInventoryLotOptions(query);
  }

  async getWarehouseOptions(query: WarehouseOptionsQuery = {}) {
    return this.repo.findWarehouseOptions(query);
  }

  async getStorageLocationOptions(query: StorageLocationOptionsQuery = {}) {
    return this.repo.findStorageLocationOptions(query);
  }

  async getAll(
    filters: ImportExportOrderFilterOptions,
    paging: ImportExportOrderPaginationOptions,
    requester: RequesterContext,
  ) {
    const effectiveFilters: ImportExportOrderFilterOptions = { ...filters };

    if (!this.isManager(requester.role)) {
      effectiveFilters.created_by = requester.actor;
    }

    return this.repo.findAll(effectiveFilters, paging);
  }

  async getWorklist(
    filters: Omit<ImportExportOrderFilterOptions, 'status'>,
    paging: ImportExportOrderPaginationOptions,
    requester: RequesterContext,
  ) {
    const effectiveFilters: ImportExportOrderFilterOptions = {
      ...filters,
      status: ImportExportOrderStatus.PENDING_CONFIRMATION,
    };

    if (!this.isManager(requester.role)) {
      effectiveFilters.created_by = requester.actor;
    }

    return this.repo.findAll(effectiveFilters, paging);
  }

  async getOne(orderId: string, requester: RequesterContext) {
    const doc = await this.repo.findOneByOrderId(orderId);
    if (!doc) {
      throw new NotFoundException(
        `Import/export order ${orderId} was not found`,
      );
    }

    this.ensureCanAccessOrder(doc, requester);
    return doc;
  }

  async confirm(
    orderId: string,
    dto: ConfirmImportExportOrderDto,
    requester: RequesterContext,
  ) {
    const existing = await this.repo.findOneByOrderId(orderId);
    if (!existing) {
      throw new NotFoundException(
        `Import/export order ${orderId} was not found`,
      );
    }

    this.ensureCanAccessOrder(existing, requester);
    if (existing.status !== ImportExportOrderStatus.PENDING_CONFIRMATION) {
      throw new ConflictException('Order has already been processed');
    }

    const confirmedItems = this.prepareConfirmedItems(existing, dto);

    const updatedOrder = await this.repo.runInTransaction(async (session) => {
      const pendingOrder = await this.repo.findOneByOrderId(orderId, session);
      if (!pendingOrder) {
        throw new NotFoundException(
          `Import/export order ${orderId} was not found`,
        );
      }

      this.ensureCanAccessOrder(pendingOrder, requester);
      if (
        pendingOrder.status !== ImportExportOrderStatus.PENDING_CONFIRMATION
      ) {
        throw new ConflictException('Order has already been processed');
      }

      const txPayloads: InventoryTransactionCreatePayload[] = [];
      for (const item of confirmedItems) {
        if (!item.lot_id) {
          throw new BadRequestException(
            `Item ${item.material_id} is missing lot_id`,
          );
        }

        let lot = await this.repo.findLotByLotId(item.lot_id, session);

        if (pendingOrder.order_type === ImportExportOrderType.INBOUND && !lot) {
          const matchedPendingItem = pendingOrder.items.find(
            (pendingItem) =>
              pendingItem.material_id === item.material_id &&
              (pendingItem.lot_id ?? '') === (item.lot_id ?? '') &&
              pendingItem.unit_of_measure === item.unit_of_measure,
          );

          lot = await this.repo.createProvisionalInboundLot(
            {
              lot_id: item.lot_id,
              material_id: item.material_id,
              unit_of_measure: item.unit_of_measure,
              storage_location: matchedPendingItem?.expected_location,
              warehouse_id: pendingOrder.warehouse_id,
              received_by: requester.actor,
            },
            session,
          );
        }

        if (!lot) {
          throw new BadRequestException(
            `Inventory lot ${item.lot_id} not found`,
          );
        }

        if (lot.material_id !== item.material_id) {
          throw new BadRequestException(
            `Lot ${item.lot_id} does not match material ${item.material_id}`,
          );
        }

        if (lot.unit_of_measure !== item.unit_of_measure) {
          throw new BadRequestException(
            `Unit mismatch for lot ${item.lot_id}: expected ${lot.unit_of_measure}, got ${item.unit_of_measure}`,
          );
        }

        if (pendingOrder.order_type === ImportExportOrderType.INBOUND) {
          const updatedLot = await this.repo.increaseLotQuantity(
            item.lot_id,
            item.actual_quantity,
            session,
          );
          if (!updatedLot) {
            throw new BadRequestException(
              `Unable to update lot ${item.lot_id} quantity`,
            );
          }
        } else {
          const updatedLot = await this.repo.decreaseLotQuantityIfEnough(
            item.lot_id,
            item.actual_quantity,
            session,
          );
          if (!updatedLot) {
            throw new ConflictException(
              `Insufficient quantity for lot ${item.lot_id}`,
            );
          }

          if (
            updatedLot.quantity === 0 &&
            updatedLot.status !== InventoryLotStatus.DEPLETED
          ) {
            await this.repo.updateLotStatus(
              item.lot_id,
              InventoryLotStatus.DEPLETED,
              session,
            );
          }
        }

        txPayloads.push({
          transaction_id: await this.redisIdService.nextId('TXN'),
          lot_id: item.lot_id,
          transaction_type:
            pendingOrder.order_type === ImportExportOrderType.INBOUND
              ? TransactionType.Receipt
              : TransactionType.Usage,
          quantity:
            pendingOrder.order_type === ImportExportOrderType.INBOUND
              ? item.actual_quantity
              : -item.actual_quantity,
          unit_of_measure: item.unit_of_measure,
          transaction_date: new Date(),
          reference_number: orderId,
          performed_by: requester.actor,
          notes: dto.confirm_note,
        });
      }

      await this.repo.createInventoryTransactions(txPayloads, session);

      const updated = await this.repo.updatePendingByOrderId(
        orderId,
        {
          status: ImportExportOrderStatus.CONFIRMED,
          confirmed_by: requester.actor,
          confirmed_at: new Date(),
          confirm_note: dto.confirm_note,
          confirmed_items: confirmedItems,
        },
        session,
      );

      if (!updated) {
        throw new ConflictException('Order has already been processed');
      }

      return updated;
    });

    const totalVariance = confirmedItems.reduce(
      (acc, item) => acc + item.variance_quantity,
      0,
    );

    this.logger.log(
      `[import-export-order] confirm order_id=${orderId} actor=${requester.actor} role=${requester.role ?? 'unknown'} status=${updatedOrder.status} item_count=${confirmedItems.length} total_variance=${totalVariance}`,
    );

    return updatedOrder;
  }

  async reject(
    orderId: string,
    dto: RejectImportExportOrderDto,
    requester: RequesterContext,
  ) {
    const existing = await this.repo.findOneByOrderId(orderId);
    if (!existing) {
      throw new NotFoundException(
        `Import/export order ${orderId} was not found`,
      );
    }

    this.ensureCanAccessOrder(existing, requester);
    if (existing.status !== ImportExportOrderStatus.PENDING_CONFIRMATION) {
      throw new ConflictException('Order has already been processed');
    }

    const updated = await this.repo.runInTransaction(async (session) => {
      const pendingOrder = await this.repo.findOneByOrderId(orderId, session);
      if (!pendingOrder) {
        throw new NotFoundException(
          `Import/export order ${orderId} was not found`,
        );
      }

      this.ensureCanAccessOrder(pendingOrder, requester);
      if (
        pendingOrder.status !== ImportExportOrderStatus.PENDING_CONFIRMATION
      ) {
        throw new ConflictException('Order has already been processed');
      }

      const rejected = await this.repo.updatePendingByOrderId(
        orderId,
        {
          status: ImportExportOrderStatus.REJECTED,
          confirmed_by: requester.actor,
          confirmed_at: new Date(),
          confirm_note: dto.reason,
          confirmed_items: [],
        },
        session,
      );

      if (!rejected) {
        throw new ConflictException('Order has already been processed');
      }

      return rejected;
    });

    this.logger.log(
      `[import-export-order] reject order_id=${orderId} actor=${requester.actor} role=${requester.role ?? 'unknown'} status=${updated.status} reason=${dto.reason}`,
    );

    return updated;
  }

  async update(
    orderId: string,
    dto: UpdateImportExportOrderDto,
    requester: RequesterContext,
  ) {
    const existing = await this.repo.findOneByOrderId(orderId);
    if (!existing) {
      throw new NotFoundException(
        `Import/export order ${orderId} was not found`,
      );
    }

    this.ensureCanAccessOrder(existing, requester);

    if (String(existing.status) !== 'PendingConfirmation') {
      throw new BadRequestException(
        'Only pending orders can be updated in US24 flow',
      );
    }

    if (dto.items) {
      this.validateItemsQuantity(dto.items);
    }

    if (dto.status) {
      throw new BadRequestException(
        'Status transition is out of scope for US24',
      );
    }

    const updatePayload: Partial<ImportExportOrder> = {
      order_type: dto.order_type,
      warehouse_id: dto.warehouse_id,
      reason: dto.reason,
      reference_number: dto.reference_number,
      attachments: dto.attachments,
    };

    const effectiveWarehouseId = dto.warehouse_id ?? existing.warehouse_id;
    await this.ensureWarehouseExists(effectiveWarehouseId);

    if (dto.items) {
      const effectiveOrderType = dto.order_type ?? existing.order_type;
      updatePayload.items = await this.normalizeItemsForOrderType(
        dto.items,
        effectiveOrderType,
        effectiveWarehouseId,
        true,
      );
    }

    const updated = await this.repo.updateByOrderId(orderId, updatePayload);

    if (!updated) {
      throw new NotFoundException(
        `Import/export order ${orderId} was not found`,
      );
    }

    this.logger.log(
      `[import-export-order] update order_id=${orderId} actor=${requester.actor} role=${requester.role ?? 'unknown'} status=${updated.status}`,
    );

    return updated;
  }

  async addAttachment(
    orderId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      filename: string;
    },
    requester: RequesterContext,
    source: ImportExportAttachmentSource = ImportExportAttachmentSource.UPLOAD,
  ) {
    const existing = await this.repo.findOneByOrderId(orderId);
    if (!existing) {
      throw new NotFoundException(
        `Import/export order ${orderId} was not found`,
      );
    }

    this.ensureCanAccessOrder(existing, requester);

    if (existing.status !== ImportExportOrderStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException(
        'Only pending orders can attach documents in US24 flow',
      );
    }

    const attachment: ImportExportOrderAttachment = {
      file_id: uuidv4(),
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
      url: `/uploads/import-export-orders/${file.filename}`,
      source,
      uploaded_by: requester.actor,
      uploaded_at: new Date(),
    };

    const updated = await this.repo.appendAttachment(orderId, attachment);
    if (!updated) {
      throw new NotFoundException(
        `Import/export order ${orderId} was not found`,
      );
    }

    this.logger.log(
      `[import-export-order] attach-document order_id=${orderId} actor=${requester.actor} role=${requester.role ?? 'unknown'} filename=${file.filename}`,
    );

    return updated;
  }

  async resolveScanCode(
    scanCode: string,
    requester: RequesterContext,
    orderType?: ImportExportOrderType,
  ): Promise<ResolveImportExportOrderScanResult> {
    const normalizedScanCode = scanCode.trim();
    if (!normalizedScanCode) {
      throw new BadRequestException('scan_code is required');
    }

    const resolveByLot = async () => {
      const byLotId = await this.repo.findLotByLotId(normalizedScanCode);
      if (byLotId) {
        return this.toResolvedFromLot(
          normalizedScanCode,
          'lot_id',
          byLotId,
          requester,
        );
      }

      const byManufacturerLot =
        await this.repo.findLotByManufacturerLot(normalizedScanCode);
      if (byManufacturerLot) {
        return this.toResolvedFromLot(
          normalizedScanCode,
          'manufacturer_lot',
          byManufacturerLot,
          requester,
        );
      }

      return null;
    };

    const resolveByMaterial = async () => {
      const byMaterialId =
        await this.repo.findMaterialByMaterialId(normalizedScanCode);
      if (byMaterialId) {
        return this.toResolvedFromMaterial(
          normalizedScanCode,
          'material_id',
          byMaterialId,
          requester,
        );
      }

      const byPartNumber =
        await this.repo.findMaterialByPartNumber(normalizedScanCode);
      if (byPartNumber) {
        return this.toResolvedFromMaterial(
          normalizedScanCode,
          'part_number',
          byPartNumber,
          requester,
        );
      }

      return null;
    };

    if (orderType === ImportExportOrderType.INBOUND) {
      const materialFirst = await resolveByMaterial();
      if (materialFirst) {
        return materialFirst;
      }

      const lotFallback = await resolveByLot();
      if (lotFallback) {
        return lotFallback;
      }
    } else {
      const lotFirst = await resolveByLot();
      if (lotFirst) {
        return lotFirst;
      }

      const materialFallback = await resolveByMaterial();
      if (materialFallback) {
        return materialFallback;
      }
    }

    return {
      scan_code: normalizedScanCode,
      resolved: false,
      matched_by: null,
      item: null,
      lot: null,
      warnings: [],
      message: 'Không tìm thấy lot hoặc material phù hợp với mã đã quét',
    };
  }

  private ensureCanAccessOrder(
    order: ImportExportOrder,
    requester: RequesterContext,
  ) {
    if (this.isManager(requester.role)) {
      return;
    }

    if (order.created_by !== requester.actor) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập phiếu của người dùng khác',
      );
    }
  }

  private isManager(role?: UserRole) {
    return role === UserRole.MANAGER;
  }

  private validateItemsQuantity(items: Array<{ quantity?: number }>) {
    if (!items || items.length === 0) {
      throw new BadRequestException('items cannot be empty');
    }

    const hasInvalidQuantity = items.some((item) => {
      if (item.quantity === undefined || item.quantity === null) {
        return true;
      }
      return item.quantity <= 0;
    });

    if (hasInvalidQuantity) {
      throw new BadRequestException('item quantity must be greater than 0');
    }
  }

  private async normalizeItemsForOrderType(
    items: CreateImportExportOrderDto['items'],
    orderType: ImportExportOrderType,
    warehouseId: string,
    reserveInboundLot: boolean,
  ) {
    const normalizedWarehouseId = warehouseId.trim();

    const normalized: ImportExportOrder['items'] = [];

    for (const item of items) {
      if (orderType === ImportExportOrderType.INBOUND) {
        if (!item.material_id?.trim()) {
          throw new BadRequestException(
            'Inbound item requires material_id from dropdown options',
          );
        }

        const material = await this.repo.findMaterialByMaterialId(
          item.material_id,
        );
        if (!material) {
          throw new BadRequestException(
            `Material ${item.material_id} was not found`,
          );
        }

        const reservedLotId = reserveInboundLot
          ? await this.repo.reserveNextLotId()
          : item.lot_id?.trim();

        if (!reservedLotId) {
          throw new BadRequestException(
            'Inbound item requires lot_id to be reserved by system',
          );
        }

        const expectedLocation = item.expected_location?.trim();
        if (!expectedLocation) {
          throw new BadRequestException(
            'Inbound item requires expected_location from location dropdown',
          );
        }

        await this.ensureLocationBelongsToWarehouse(
          expectedLocation,
          normalizedWarehouseId,
        );

        normalized.push({
          ...item,
          material_id: item.material_id,
          lot_id: reservedLotId,
          expected_location: expectedLocation,
        });
        continue;
      }

      if (!item.lot_id?.trim()) {
        throw new BadRequestException(
          'Outbound item requires lot_id from dropdown options',
        );
      }

      const lot = await this.repo.findLotByLotId(item.lot_id);
      if (!lot) {
        throw new BadRequestException(`Inventory lot ${item.lot_id} not found`);
      }

      const lotStorageLocation = lot.storage_location?.trim();
      if (!lotStorageLocation) {
        throw new BadRequestException(
          `Lot ${item.lot_id} does not have storage_location`,
        );
      }

      let lotWarehouseId = lot.warehouse_id?.trim();
      if (!lotWarehouseId) {
        const mappedLocation =
          await this.repo.findStorageLocationById(lotStorageLocation);
        lotWarehouseId = mappedLocation?.warehouse_id?.trim();
      }

      if (!lotWarehouseId) {
        throw new BadRequestException(
          `Lot ${item.lot_id} does not map to a warehouse`,
        );
      }

      if (lotWarehouseId !== normalizedWarehouseId) {
        throw new BadRequestException(
          `Lot ${item.lot_id} belongs to warehouse ${lotWarehouseId}, but order warehouse is ${normalizedWarehouseId}`,
        );
      }

      if (
        item.expected_location?.trim() &&
        item.expected_location.trim() !== lotStorageLocation
      ) {
        throw new BadRequestException(
          `Lot ${item.lot_id} is stored at ${lotStorageLocation}, expected_location cannot be ${item.expected_location}`,
        );
      }

      if (item.material_id && item.material_id !== lot.material_id) {
        throw new BadRequestException(
          `Lot ${item.lot_id} does not match material ${item.material_id}`,
        );
      }

      if (
        item.unit_of_measure &&
        item.unit_of_measure !== lot.unit_of_measure
      ) {
        throw new BadRequestException(
          `Unit mismatch for lot ${item.lot_id}: expected ${lot.unit_of_measure}, got ${item.unit_of_measure}`,
        );
      }

      normalized.push({
        ...item,
        material_id: lot.material_id,
        unit_of_measure: lot.unit_of_measure,
        expected_location: lotStorageLocation,
      });
    }

    return normalized;
  }

  private async ensureWarehouseExists(warehouseId: string) {
    if (!warehouseId?.trim()) {
      throw new BadRequestException('warehouse_id is required');
    }

    const warehouse = await this.repo.findWarehouseById(warehouseId.trim());

    if (!warehouse || warehouse.is_active === false) {
      throw new BadRequestException(
        `Warehouse ${warehouseId} is not available`,
      );
    }
  }

  private async ensureLocationBelongsToWarehouse(
    locationId: string,
    warehouseId: string,
  ) {
    const location = await this.repo.findStorageLocationById(locationId.trim());

    if (!location || location.is_active === false) {
      throw new BadRequestException(
        `Storage location ${locationId} is not available`,
      );
    }

    if (location.warehouse_id !== warehouseId) {
      throw new BadRequestException(
        `Storage location ${locationId} does not belong to warehouse ${warehouseId}`,
      );
    }
  }

  private prepareConfirmedItems(
    order: ImportExportOrder,
    dto: ConfirmImportExportOrderDto,
  ) {
    if (!order.blind_count_required) {
      throw new BadRequestException('Blind count is disabled for this order');
    }

    if (dto.confirmed_items.length !== order.items.length) {
      throw new BadRequestException(
        'confirmed_items must fully match order items',
      );
    }

    const expectedMap = new Map<string, ImportExportOrder['items']>();
    for (const expected of order.items) {
      const key = this.toItemKey(
        expected.material_id,
        expected.lot_id,
        expected.unit_of_measure,
      );
      const current = expectedMap.get(key) ?? [];
      current.push(expected);
      expectedMap.set(key, current);
    }

    const prepared = dto.confirmed_items.map((confirmed) => {
      const key = this.toItemKey(
        confirmed.material_id,
        confirmed.lot_id,
        confirmed.unit_of_measure,
      );
      const candidates = expectedMap.get(key);

      if (!candidates || candidates.length === 0) {
        throw new BadRequestException(
          `confirmed item is not in order: ${confirmed.material_id}/${confirmed.lot_id ?? 'no-lot'}`,
        );
      }

      const expected = candidates.shift();
      if (!expected) {
        throw new BadRequestException(
          `confirmed item is not in order: ${confirmed.material_id}/${confirmed.lot_id ?? 'no-lot'}`,
        );
      }

      if (!this.isNumberEqual(confirmed.expected_quantity, expected.quantity)) {
        throw new BadRequestException(
          `expected_quantity mismatch for ${confirmed.material_id}/${confirmed.lot_id ?? 'no-lot'}`,
        );
      }

      return {
        material_id: confirmed.material_id,
        lot_id: confirmed.lot_id,
        expected_quantity: expected.quantity,
        actual_quantity: confirmed.actual_quantity,
        variance_quantity: confirmed.actual_quantity - expected.quantity,
        unit_of_measure: confirmed.unit_of_measure,
      };
    });

    const hasUnmatchedItems = Array.from(expectedMap.values()).some(
      (items) => items.length > 0,
    );

    if (hasUnmatchedItems) {
      throw new BadRequestException(
        'confirmed_items must fully match order items',
      );
    }

    return prepared;
  }

  private toItemKey(materialId: string, lotId?: string, unit?: string) {
    return `${materialId}::${lotId ?? ''}::${unit ?? ''}`;
  }

  private isNumberEqual(left: number, right: number) {
    return Math.abs(left - right) < 1e-9;
  }

  private async toResolvedFromLot(
    scanCode: string,
    matchedBy: 'lot_id' | 'manufacturer_lot',
    lot: {
      lot_id: string;
      material_id: string;
      manufacturer_lot: string;
      unit_of_measure: string;
      storage_location?: string;
      warehouse_id?: string;
      status: string;
      quantity: number;
    },
    requester: RequesterContext,
  ): Promise<ResolveImportExportOrderScanResult> {
    const material = await this.repo.findMaterialByMaterialId(lot.material_id);

    const warnings: string[] = [];
    if (lot.status === 'Rejected' || lot.status === 'Depleted') {
      warnings.push(`Lot ${lot.lot_id} đang ở trạng thái ${lot.status}`);
    }

    const result: ResolveImportExportOrderScanResult = {
      scan_code: scanCode,
      resolved: true,
      matched_by: matchedBy,
      item: {
        material_id: lot.material_id,
        lot_id: lot.lot_id,
        material_name: material?.material_name ?? null,
        unit_of_measure: lot.unit_of_measure ?? null,
        expected_location: lot.storage_location ?? null,
        warehouse_id: lot.warehouse_id ?? null,
      },
      lot: {
        status: lot.status,
        quantity: lot.quantity,
        manufacturer_lot: lot.manufacturer_lot,
      },
      warnings,
    };

    this.logger.log(
      `[import-export-order] scan-resolve actor=${requester.actor} role=${requester.role ?? 'unknown'} matched_by=${matchedBy} scan_code=${scanCode}`,
    );

    return result;
  }

  private toResolvedFromMaterial(
    scanCode: string,
    matchedBy: 'material_id' | 'part_number',
    material: {
      material_id: string;
      material_name: string;
    },
    requester: RequesterContext,
  ): ResolveImportExportOrderScanResult {
    const result: ResolveImportExportOrderScanResult = {
      scan_code: scanCode,
      resolved: true,
      matched_by: matchedBy,
      item: {
        material_id: material.material_id,
        lot_id: null,
        material_name: material.material_name,
        unit_of_measure: null,
        expected_location: null,
        warehouse_id: null,
      },
      lot: null,
      warnings: [],
    };

    this.logger.log(
      `[import-export-order] scan-resolve actor=${requester.actor} role=${requester.role ?? 'unknown'} matched_by=${matchedBy} scan_code=${scanCode}`,
    );

    return result;
  }
}
