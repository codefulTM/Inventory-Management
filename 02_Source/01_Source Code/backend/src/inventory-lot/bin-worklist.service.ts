import { Injectable, BadRequestException } from '@nestjs/common';
import { InventoryLotRepository } from './inventory-lot.repository';
import { BinCountRecordRepository } from './bin-count-record.repository';
import type { SubmitBinCountDto } from './dto/bin-worklist.dto';
import { WarehouseSlipService } from '../warehouse-slip/warehouse-slip.service';
import { WarehouseSlipType, WarehouseSlipStatus } from '../warehouse-slip/dto/create-warehouse-slip.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.schema';
import { MailService } from '../mail/mail.service';

@Injectable()
export class BinWorklistService {
  constructor(
    private readonly inventoryLotRepo: InventoryLotRepository,
    private readonly binCountRepo: BinCountRecordRepository,
    private readonly warehouseSlipService: WarehouseSlipService,
    private readonly auditLogService: AuditLogService,
    private readonly mailService: MailService,
  ) {}

  async getWorklist(warehouse_id?: string, page = 1, limit = 50) {
    const match: any = {};
    if (warehouse_id) match.warehouse_id = warehouse_id;
    match.storage_location = { $ne: null };

    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: '$storage_location',
          expected_qty: { $sum: '$quantity' },
          lots: {
            $push: {
              lot_id: '$lot_id',
              material_id: '$material_id',
              qty: '$quantity',
            },
          },
          last_modified: { $max: '$modified_date' },
        },
      },
      {
        $project: {
          bin_code: '$_id',
          expected_qty: 1,
          lots: 1,
          last_count_date: '$last_modified',
        },
      },
      { $sort: { expected_qty: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const data = await this.inventoryLotRepo.aggregate(pipeline);
    const totalAgg = await this.inventoryLotRepo.aggregate([
      { $match: match },
      { $group: { _id: '$storage_location' } },
      { $count: 'total' },
    ]);
    const total = (totalAgg[0] && totalAgg[0].total) || 0;
    return { data, total, page, limit };
  }

  async getBinDetails(bin_code: string) {
    if (!bin_code) throw new BadRequestException('bin_code required');
    const pipeline = [
      { $match: { storage_location: bin_code } },
      {
        $project: {
          lot_id: 1,
          material_id: 1,
          quantity: 1,
          unit_of_measure: 1,
          status: 1,
          received_date: 1,
          expiration_date: 1,
        },
      },
      { $sort: { received_date: 1 } },
    ];
    const lots = await this.inventoryLotRepo.aggregate(pipeline);
    return { bin_code, lots };
  }

  async submitCounts(bin_code: string, dto: SubmitBinCountDto) {
    if (!bin_code) throw new BadRequestException('bin_code required');
    const lots = await this.inventoryLotRepo.aggregate([
      { $match: { storage_location: bin_code } },
      {
        $group: {
          _id: '$lot_id',
          expected_qty: { $sum: '$quantity' },
          material_id: { $first: '$material_id' },
        },
      },
    ]);

    const expectedMap = new Map<string, any>();
    for (const l of lots) expectedMap.set(l._id, l);

    let expectedTotal = 0;
    for (const v of expectedMap.values()) expectedTotal += v.expected_qty || 0;
    const countedTotal = dto.entries.reduce(
      (s, e) => s + Number(e.counted_qty || 0),
      0,
    );

    const deltaPct =
      expectedTotal === 0
        ? 100
        : (Math.abs(countedTotal - expectedTotal) / expectedTotal) * 100;

    const flag_review =
      deltaPct >= 50 || (expectedTotal === 0 && countedTotal > 0);

    const recordData = {
      bin_code,
      counted_by: dto.counted_by,
      counted_at: new Date(),
      entries: dto.entries.map((e) => ({
        lot_id: e.lot_id,
        material_id: e.material_id,
        expected_qty: expectedMap.get(e.lot_id ?? '')?.expected_qty ?? 0,
        counted_qty: e.counted_qty,
        notes: e.notes,
      })),
      flag_review,
      notes: dto.notes,
    };

    const record = await this.binCountRepo.create(recordData as any);

    // audit log
    try {
      await this.auditLogService.log(dto.counted_by, AuditAction.INVENTORY_LOT_UPDATED, undefined, {
        bin_code,
        record_id: record._id,
        delta_pct: Math.round(deltaPct * 100) / 100,
        flag_review,
      });
    } catch (_) {}

    // notify manager when flagged
    if (flag_review) {
      const managerEmail = process.env.MANAGER_EMAIL;
      if (managerEmail) {
        try {
          await this.mailService.sendNewAccountEmail(
            managerEmail,
            `Inventory Manager`,
            'Manager',
            `Bin ${bin_code} flagged for review (delta=${Math.round(deltaPct * 100) / 100}%).`,
          );
        } catch (_) {}
      }
    }

    // auto-create warehouse slips for small discrepancies if enabled
    const autoAdjust = (process.env.AUTO_ADJUST_BIN_COUNT || '').toLowerCase() === 'true';
    if (!flag_review && autoAdjust) {
      const lotIds = dto.entries.map((e) => e.lot_id).filter(Boolean) as string[];
      const lotsInfo = await this.inventoryLotRepo.findByLotIds(lotIds);
      const lotMap = new Map(lotsInfo.map((l: any) => [l.lot_id, l]));

      for (const e of dto.entries) {
        const expected = expectedMap.get(e.lot_id ?? '')?.expected_qty ?? 0;
        const diff = Number(e.counted_qty || 0) - expected;
        if (!e.lot_id || diff === 0) continue;

        const lot = lotMap.get(e.lot_id) as any;
        const warehouse_id = lot?.warehouse_id || process.env.DEFAULT_WAREHOUSE_ID;
        if (!warehouse_id) continue;

        const slipType = diff > 0 ? WarehouseSlipType.IN : WarehouseSlipType.OUT;
        try {
          await this.warehouseSlipService.create(
            {
              type: slipType,
              warehouse_id,
              notes: `Auto-adjust from bin count ${bin_code}`,
              lines: [
                {
                  lot_id: e.lot_id,
                  material_id: e.material_id,
                  quantity: Math.abs(Math.trunc(diff)) || 0,
                  unit: lot?.unit_of_measure || 'EA',
                },
              ],
              status: WarehouseSlipStatus.PENDING,
            },
            { actor: dto.counted_by },
          );
        } catch (_) {
          // ignore slip creation errors
        }
      }
    }

    return {
      success: true,
      flag_review,
      record_id: record._id,
      delta_pct: Math.round(deltaPct * 100) / 100,
    };
  }
}
