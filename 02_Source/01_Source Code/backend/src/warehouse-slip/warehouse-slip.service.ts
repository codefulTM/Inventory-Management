import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { WarehouseSlipRepository } from './warehouse-slip.repository';
import { CreateWarehouseSlipDto } from './dto/create-warehouse-slip.dto';
import { InventoryTransactionService } from '../inventory-transaction/inventory-transaction.service';
import { TransactionType } from '../inventory-transaction/dto/create-inventory-transaction.dto';
import { InventoryLotRepository } from '../inventory-lot/inventory-lot.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.schema';

@Injectable()
export class WarehouseSlipService {
  constructor(
    private readonly repo: WarehouseSlipRepository,
    private readonly inventoryTransactionService: InventoryTransactionService,
    private readonly inventoryLotRepository: InventoryLotRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  private generateSlipNumber() {
    const ts = new Date().toISOString().replace(/[^0-9]/g, '');
    return `SLIP-${ts}-${uuidv4().slice(0, 8)}`;
  }

  async create(dto: CreateWarehouseSlipDto, requester: { actor: string }) {
    // validate warehouse
    const warehouse = await this.repo.findWarehouseById(dto.warehouse_id);
    if (!warehouse) {
      throw new BadRequestException('warehouse_id does not exist');
    }
    // ensure warehouse is active
    if (!warehouse.is_active) {
      throw new BadRequestException('warehouse_id is not active');
    }

    // validate materials and compute totals
    const lines = Array.isArray(dto.lines) ? dto.lines : [];
    let total_quantity = 0;
    let total_value = 0;

    for (const l of lines) {
      const qty = Number(l.quantity || 0);
      if (qty <= 0) {
        throw new BadRequestException('Each line must have quantity > 0');
      }
      total_quantity += qty;

      // if material_id provided, ensure it exists and is Approved
      if (l.material_id) {
        const mat = await this.repo.findMaterialById(l.material_id);
        if (!mat) {
          throw new BadRequestException(
            `material_id ${l.material_id} does not exist`,
          );
        }
        if ((mat.status || '').toLowerCase() !== 'approved') {
          throw new BadRequestException(
            `material_id ${l.material_id} is not Approved`,
          );
        }
      }

      const price = Number(l.unit_price || 0);
      total_value += price * qty;
    }

    if (total_quantity < 0 || total_value < 0) {
      throw new BadRequestException(
        'Total quantity/value must be non-negative',
      );
    }

    const payload: any = {
      slip_id: uuidv4(),
      slip_number: this.generateSlipNumber(),
      type: dto.type,
      warehouse_id: dto.warehouse_id,
      reference_number: dto.reference_number,
      notes: dto.notes,
      lines: dto.lines || [],
      attachments: dto.attachments || [],
      total_quantity,
      total_value,
      created_by: requester.actor,
      status: dto.status ?? 'PENDING',
    };

    return this.repo.create(payload);
  }

  async getAll(filters: any, paging: any, requester: { actor: string }) {
    return this.repo.findAll(filters, paging);
  }

  async getOne(slipId: string, requester: { actor: string }) {
    const doc = await this.repo.findOneBySlipId(slipId);
    if (!doc) throw new NotFoundException('Warehouse slip not found');
    return doc;
  }

  async addAttachment(
    slipId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      filename: string;
    },
    requester: { actor: string },
    source?: string,
  ) {
    // Build attachment metadata
    const attachment = {
      file_id: uuidv4(),
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
      url: `/uploads/warehouse-slips/${file.filename}`,
      storage_source: 'local',
      uploaded_by: requester.actor,
      uploaded_at: new Date(),
    };

    return this.repo.appendAttachment(slipId, attachment);
  }

  async approve(slipId: string, requester: { actor: string; role?: string }) {
    const slip = await this.repo.findOneBySlipId(slipId);
    if (!slip) throw new NotFoundException('Warehouse slip not found');
    if (!slip.status || slip.status !== 'PENDING') {
      throw new ConflictException('Warehouse slip is not pending');
    }

    const applied: Array<{
      lot_id: string;
      delta: number;
      txId?: any;
    }> = [];

    try {
      const lines = Array.isArray(slip.lines) ? slip.lines : [];
      for (const l of lines) {
        const qty = Number(l.quantity || 0);
        if (!l.lot_id) throw new BadRequestException('Line missing lot_id');
        if (qty <= 0) throw new BadRequestException('Invalid line quantity');

        const lot = await this.inventoryLotRepository.findById(l.lot_id);
        if (!lot) throw new BadRequestException(`Lot ${l.lot_id} not found`);

        if ((slip.type || '').toUpperCase() === 'IN') {
          // Receipt: quantity positive
          const tx = await this.inventoryTransactionService.create({
            lot_id: l.lot_id,
            transaction_type: TransactionType.Receipt,
            quantity: qty,
            unit_of_measure: l.unit || lot.unit_of_measure || 'EA',
            performed_by: requester.actor,
            reference_number: `slip:${slip.slip_id}`,
            notes: `Approve slip ${slip.slip_number}`,
            transaction_date: new Date().toISOString(),
          } as any);

          // update lot quantity
          await this.inventoryLotRepository.updateQuantity(l.lot_id, qty as any);
          applied.push({ lot_id: l.lot_id, delta: qty, txId: tx?._id ?? tx?.transaction_id });
        } else {
          // OUT: usage, ensure sufficient stock
          const available = Number(lot.quantity || 0);
          if (available < qty) {
            throw new BadRequestException(
              `Insufficient stock on lot ${l.lot_id}: available=${available}`,
            );
          }
          const tx = await this.inventoryTransactionService.create({
            lot_id: l.lot_id,
            transaction_type: TransactionType.Usage,
            quantity: -Math.abs(qty),
            unit_of_measure: l.unit || lot.unit_of_measure || 'EA',
            performed_by: requester.actor,
            reference_number: `slip:${slip.slip_id}`,
            notes: `Approve slip ${slip.slip_number}`,
            transaction_date: new Date().toISOString(),
          } as any);

          await this.inventoryLotRepository.updateQuantity(l.lot_id, -qty as any);
          applied.push({ lot_id: l.lot_id, delta: -qty, txId: tx?._id ?? tx?.transaction_id });
        }
      }

      // mark slip as confirmed
      const updated = await this.repo.updateBySlipId(slipId, {
        status: 'CONFIRMED',
        confirmed_by: requester.actor,
        confirmed_at: new Date(),
        locked: true,
        processed_transactions: (slip.processed_transactions || []).concat(
          applied.map((a) => a.txId),
        ),
      });

      // audit
      try {
        await this.auditLogService.log(
          requester.actor,
          AuditAction.INVENTORY_LOT_UPDATED,
          undefined,
          { slip_id: slipId, action: 'APPROVE', processed: applied.map((a) => a.txId) },
        );
      } catch (_) {
        // swallow audit failures
      }

      return updated;
    } catch (err) {
      // rollback applied ops
      for (const a of applied.reverse()) {
        try {
          // revert lot quantity
          await this.inventoryLotRepository.updateQuantity(a.lot_id, -a.delta as any);
        } catch (_) {}
        try {
          // try to remove created transaction if we have object id
          if (a.txId) {
            await this.inventoryTransactionService.remove(String(a.txId));
          }
        } catch (_) {}
      }
      throw err;
    }
  }

  async reject(
    slipId: string,
    reason: string,
    requester: { actor: string; role?: string },
  ) {
    const slip = await this.repo.findOneBySlipId(slipId);
    if (!slip) throw new NotFoundException('Warehouse slip not found');
    if (!reason || !String(reason).trim()) {
      throw new BadRequestException('Reject reason is required');
    }
    if (!slip.status || slip.status !== 'PENDING') {
      throw new ConflictException('Warehouse slip is not pending');
    }

    const updated = await this.repo.updateBySlipId(slipId, {
      status: 'REJECTED',
      rejected_by: requester.actor,
      rejected_at: new Date(),
      reject_reason: reason,
      locked: false,
    });

    try {
      await this.auditLogService.log(
        requester.actor,
        AuditAction.INVENTORY_LOT_UPDATED,
        undefined,
        { slip_id: slipId, action: 'REJECT', reason },
      );
    } catch (_) {}

    return updated;
  }
}
