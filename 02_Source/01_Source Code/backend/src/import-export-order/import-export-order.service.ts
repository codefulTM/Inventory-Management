import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateImportExportOrderDto } from './dto/create-import-export-order.dto';
import { UpdateImportExportOrderDto } from './dto/update-import-export-order.dto';
import {
  ImportExportOrderFilterOptions,
  ImportExportOrderPaginationOptions,
  ImportExportOrderRepository,
} from './import-export-order.repository';
import {
  ImportExportAttachmentSource,
  ImportExportOrderAttachment,
  ImportExportOrder,
  ImportExportOrderStatus,
} from '../schemas/import-export-order.schema';
import { UserRole } from '../schemas/user.schema';

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

  constructor(private readonly repo: ImportExportOrderRepository) {}

  async create(dto: CreateImportExportOrderDto, requester: RequesterContext) {
    this.validateItemsQuantity(dto.items);

    const payload = {
      ...dto,
      order_id: uuidv4(),
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

    const updatePayload: Partial<ImportExportOrder> = { ...dto };
    delete updatePayload.status;

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
  ): Promise<ResolveImportExportOrderScanResult> {
    const normalizedScanCode = scanCode.trim();
    if (!normalizedScanCode) {
      throw new BadRequestException('scan_code is required');
    }

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

  private async toResolvedFromLot(
    scanCode: string,
    matchedBy: 'lot_id' | 'manufacturer_lot',
    lot: {
      lot_id: string;
      material_id: string;
      manufacturer_lot: string;
      unit_of_measure: string;
      storage_location?: string;
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
