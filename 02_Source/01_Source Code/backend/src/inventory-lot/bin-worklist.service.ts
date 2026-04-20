import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InventoryLotRepository } from './inventory-lot.repository';
import { BinCountRecordRepository } from './bin-count-record.repository';
import { MaterialRepository } from '../material/material.repository';
import type { SubmitBinCountDto } from './dto/bin-worklist.dto';
import { WarehouseSlipService } from '../warehouse-slip/warehouse-slip.service';
import {
  WarehouseSlipType,
  WarehouseSlipStatus,
} from '../warehouse-slip/dto/create-warehouse-slip.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.schema';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import {
  StorageLocation,
  StorageLocationDocument,
} from '../schemas/storage-location.schema';

@Injectable()
export class BinWorklistService {
  constructor(
    private readonly inventoryLotRepo: InventoryLotRepository,
    private readonly binCountRepo: BinCountRecordRepository,
    private readonly materialRepo: MaterialRepository,
    private readonly warehouseSlipService: WarehouseSlipService,
    private readonly auditLogService: AuditLogService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @InjectModel(StorageLocation.name)
    private readonly storageLocationModel: Model<StorageLocationDocument>,
  ) {}

  async createBin(body: {
    bin_code: string;
    warehouse_id?: string;
    location_name?: string;
    expected_qty?: number;
  }) {
    if (!body || !body.bin_code)
      throw new BadRequestException('bin_code required');
    const location_id = body.bin_code.trim();
    const warehouse_id =
      body.warehouse_id ||
      this.configService.get<string>('DEFAULT_WAREHOUSE_ID') ||
      'default';
    const location_name = body.location_name || location_id;
    const expected_qty =
      typeof (body as any).expected_qty === 'number'
        ? Number((body as any).expected_qty)
        : undefined;

    const setOnInsert: any = {
      location_id,
      warehouse_id,
      location_name,
      is_active: true,
    };
    if (expected_qty !== undefined) setOnInsert.expected_qty = expected_qty;

    const created = await this.storageLocationModel
      .findOneAndUpdate(
        { location_id },
        { $setOnInsert: setOnInsert },
        { upsert: true, new: true },
      )
      .lean()
      .exec();

    return created;
  }

  async updateBin(
    bin_code: string,
    body: {
      warehouse_id?: string;
      location_name?: string;
      is_active?: boolean;
      expected_qty?: number;
    },
  ) {
    if (!bin_code) throw new BadRequestException('bin_code required');
    const location_id = bin_code.trim();
    const update: any = {};
    if (body.warehouse_id !== undefined)
      update.warehouse_id = body.warehouse_id;
    if (body.location_name !== undefined)
      update.location_name = body.location_name;
    if (body.is_active !== undefined)
      update.is_active = Boolean(body.is_active);
    if ((body as any).expected_qty !== undefined) {
      update.expected_qty = Number((body as any).expected_qty);
    }

    const updated = await this.storageLocationModel
      .findOneAndUpdate({ location_id }, { $set: update }, { new: true })
      .lean()
      .exec();

    return updated;
  }

  async deleteBin(bin_code: string) {
    if (!bin_code) throw new BadRequestException('bin_code required');
    const location_id = bin_code.trim();
    const deleted = await this.storageLocationModel
      .findOneAndDelete({ location_id })
      .lean()
      .exec();
    return { success: !!deleted };
  }

  async getWorklist(warehouse_id?: string, page = 1, limit = 50, q?: string) {
    // Return bins from storage_locations collection (show storage locations even if no inventory lots)
    const query: any = { is_active: true };
    if (warehouse_id) query.warehouse_id = warehouse_id;

    if (q && String(q).trim().length > 0) {
      const term = String(q).trim();
      // search by location_id or location_name (case-insensitive substring)
      query.$or = [
        { location_id: { $regex: term, $options: 'i' } },
        { location_name: { $regex: term, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      this.storageLocationModel
        .find(query, {
          location_id: 1,
          warehouse_id: 1,
          location_name: 1,
          modified_date: 1,
        })
        .sort({ location_id: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.storageLocationModel.countDocuments(query).exec(),
    ]);

    // compute inventory-lot arrays and last bin-count post date per bin
    const locationIds = (docs || []).map((d: any) => d.location_id).filter(Boolean);
    let lotsMap = new Map<string, any[]>();
    let lastCountMap = new Map<string, any>();

    if (locationIds.length > 0) {
      try {
        // group lots by storage_location and push basic summary fields
        const lotsByLocation = await this.inventoryLotRepo.aggregate([
          { $match: { storage_location: { $in: locationIds } } },
          {
            $project: {
              storage_location: 1,
              lot_id: 1,
              material_id: 1,
              quantity: 1,
            },
          },
          {
            $group: {
              _id: '$storage_location',
              lots: {
                $push: {
                  lot_id: '$lot_id',
                  material_id: '$material_id',
                  qty: '$quantity',
                },
              },
            },
          },
        ]);
        lotsMap = new Map((lotsByLocation || []).map((r: any) => [r._id, r.lots || []]));
      } catch (_) {
        // ignore aggregation errors and leave empty arrays
      }

      try {
        // fetch latest count per bin by requesting the most recent record for each bin
        const lastCountPairs = await Promise.all(
          locationIds.map(async (id: string) => {
            try {
              const res = await this.binCountRepo.findByBin(id, 1, 1);
              const rec = res && res.data && res.data[0] ? res.data[0] : null;
              return [id, rec ? rec.counted_at : null] as [string, any];
            } catch (_) {
              return [id, null] as [string, any];
            }
          }),
        );
        lastCountMap = new Map(lastCountPairs as Array<[string, any]>);
      } catch (_) {
        // ignore errors and leave last dates as null
      }
    }

    const data = (docs || []).map((d: any) => ({
      bin_code: d.location_id,
      expected_qty: d.expected_qty ?? undefined,
      // array of lot summaries (lot_id, material_id, qty)
      lots: lotsMap.get(d.location_id) ?? [],
      // use the last posted bin count date, or null if none
      last_count_date: lastCountMap.get(d.location_id) ?? null,
    }));

    return { data, total: total || 0, page, limit };
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

    // update storage location's modified_date to reflect the successful count
    try {
      await this.storageLocationModel
        .findOneAndUpdate(
          { location_id: bin_code },
          { $set: { modified_date: record.counted_at ?? new Date() } },
          { new: true },
        )
        .lean()
        .exec();
    } catch (_) {
      // ignore update errors
    }

    // audit log
    try {
      await this.auditLogService.log(
        dto.counted_by,
        AuditAction.INVENTORY_LOT_UPDATED,
        undefined,
        {
          bin_code,
          record_id: record._id,
          delta_pct: Math.round(deltaPct * 100) / 100,
          flag_review,
        },
      );
    } catch (_) {}

    // notify manager when flagged (include totals)
    if (flag_review) {
      const managerEmail = this.configService.get<string>('MANAGER_EMAIL');
      if (managerEmail) {
        try {
          await this.mailService.sendBinFlagEmail(
            managerEmail,
            bin_code,
            Math.round(deltaPct * 100) / 100,
            String(record._id),
            countedTotal,
            expectedTotal,
          );
        } catch (_) {}
      }
    }

    // auto-create warehouse slips for small discrepancies if enabled
    const autoAdjust =
      (
        this.configService.get<string>('AUTO_ADJUST_BIN_COUNT') || ''
      ).toLowerCase() === 'true';
    if (!flag_review && autoAdjust) {
      const lotIds = dto.entries
        .map((e) => e.lot_id)
        .filter(Boolean) as string[];
      const lotsInfo = await this.inventoryLotRepo.findByLotIds(lotIds);
      const lotMap = new Map(lotsInfo.map((l: any) => [l.lot_id, l]));

      for (const e of dto.entries) {
        const expected = expectedMap.get(e.lot_id ?? '')?.expected_qty ?? 0;
        const diff = Number(e.counted_qty || 0) - expected;
        if (!e.lot_id || diff === 0) continue;

        const lot = lotMap.get(e.lot_id) as any;
        const warehouse_id =
          lot?.warehouse_id ||
          this.configService.get<string>('DEFAULT_WAREHOUSE_ID');
        if (!warehouse_id) continue;

        const slipType =
          diff > 0 ? WarehouseSlipType.IN : WarehouseSlipType.OUT;
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

  async getBinCounts(bin_code: string, page = 1, limit = 20) {
    if (!bin_code) throw new BadRequestException('bin_code required');
    const { data, total } = await this.binCountRepo.findByBin(
      bin_code,
      page,
      limit,
    );

    // collect material_ids and lot_ids to enrich entries
    const materialIds = new Set<string>();
    const lotIds = new Set<string>();
    for (const r of data || []) {
      for (const e of r.entries || []) {
        if (e.material_id) materialIds.add(e.material_id);
        if (e.lot_id) lotIds.add(e.lot_id);
      }
    }

    const [materials, lotsInfo] = await Promise.all([
      this.materialRepo.findByMaterialIds(Array.from(materialIds)),
      this.inventoryLotRepo.findByLotIds(Array.from(lotIds)),
    ]);

    const materialMap = new Map(
      (materials || []).map((m: any) => [m.material_id, m]),
    );
    const lotMap = new Map((lotsInfo || []).map((l: any) => [l.lot_id, l]));

    const transformed = (data || []).map((r: any) => {
      const expectedTotal = (r.entries || []).reduce(
        (s: number, e: any) => s + Number(e.expected_qty || 0),
        0,
      );
      const countedTotal = (r.entries || []).reduce(
        (s: number, e: any) => s + Number(e.counted_qty || 0),
        0,
      );
      const deltaPct =
        expectedTotal === 0
          ? 100
          : (Math.abs(countedTotal - expectedTotal) / expectedTotal) * 100;
      return {
        _id: r._id,
        bin_code: r.bin_code,
        counted_by: r.counted_by,
        counted_at: r.counted_at,
        expected_total: expectedTotal,
        counted_total: countedTotal,
        delta_pct: Math.round(deltaPct * 100) / 100,
        flag_review: !!r.flag_review,
        notes: r.notes,
        entries: (r.entries || []).map((e: any) => ({
          lot_id: e.lot_id,
          material_id: e.material_id,
          material_name: materialMap.get(e.material_id)?.material_name ?? null,
          expected_qty: e.expected_qty,
          counted_qty: e.counted_qty,
          notes: e.notes,
          unit_of_measure: lotMap.get(e.lot_id)?.unit_of_measure ?? null,
        })),
      };
    });

    return { data: transformed, total: total || 0, page, limit };
  }
}
