import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InventoryLotRepository } from './inventory-lot.repository';
import { BinCountRecordRepository } from './bin-count-record.repository';
import { MaterialRepository } from '../material/material.repository';
import type { SubmitBinCountDto } from './dto/bin-worklist.dto';
import {
  WarehouseSlipService,
  WarehouseSlipType,
  WarehouseSlipStatus,
} from '../warehouse-slip';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.schema';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { UserRole } from '../schemas/user.schema';
import {
  StorageLocation,
  StorageLocationDocument,
} from '../schemas/storage-location.schema';

/**
 * Service quản lý Bin Worklist - Quy trình đếm và kiểm kê tồn kho tại từng vị trí lưu kho (bin)
 * 
 * Bin (hay Storage Location) là vị trí lưu kho cụ thể trong hệ thống phân cấp:
 * Warehouse (Kho) -> Zone (Khu vực) -> Rack (Giá) -> Bin (Vị trí cụ thể)
 * 
 * Chức năng chính:
 * 1. Quản lý danh sách Bin (tạo, sửa, xóa, cập nhật trạng thái)
 * 2. Lấy worklist bins - hiển thị tất cả bins kèm thông tin lô hàng và lần đếm cuối
 * 3. Ghi nhận kết quả đếm tồn kho tại bin (submit counts)
 * 4. So sánh số lượng đếm được vs kỳ vọng, phát hiện bất thường
 * 5. Tự động gửi email cho Manager khi có chênh lệch lớn (flag_review)
 * 6. Tự động tạo Warehouse Slip điều chỉnh nếu bật AUTO_ADJUST_BIN_COUNT
 * 7. Ghi log kiểm toán cho mọi hành động đếm
 */
@Injectable()
export class BinWorklistService {
  constructor(
    private readonly inventoryLotRepo: InventoryLotRepository,     // Truy vấn lô hàng
    private readonly binCountRepo: BinCountRecordRepository,       // Lưu trữ lịch sử đếm
    private readonly materialRepo: MaterialRepository,             // Truy vấn vật tư
    private readonly warehouseSlipService: WarehouseSlipService,  // Tạo phiếu xuất/nhập điều chỉnh
    private readonly auditLogService: AuditLogService,            // Ghi log kiểm toán
    private readonly mailService: MailService,                    // Gửi email thông báo
    private readonly configService: ConfigService,                // Đọc cấu hình
    private readonly userService: UserService,                     // Lấy danh sách Manager
    @InjectModel(StorageLocation.name)
    private readonly storageLocationModel: Model<StorageLocationDocument>, // Model Bin/Storage Location
  ) {}

  /**
   * Tạo mới một Bin (vị trí lưu kho)
   * Sử dụng upsert: Nếu bin đã tồn tại sẽ giữ nguyên (không ghi đè)
   * 
   * @param body - Dữ liệu bin: bin_code (bắt buộc), warehouse_id, location_name, expected_qty
   * @returns Thông tin bin vừa tạo hoặc đã tồn tại
   */
  async createBin(body: {
    bin_code: string;
    warehouse_id?: string;
    location_name?: string;
    expected_qty?: number;
  }) {
    if (!body || !body.bin_code)
      throw new BadRequestException('bin_code required');

    const location_id = bin_code.trim();
    
    // Nếu không có warehouse_id sẽ dùng giá trị mặc định từ config
    const warehouse_id =
      body.warehouse_id ||
      this.configService.get<string>('DEFAULT_WAREHOUSE_ID') ||
      'default';
    
    const location_name = body.location_name || location_id;
    const expected_qty =
      typeof (body as any).expected_qty === 'number'
        ? Number((body as any).expected_qty)
        : undefined;

    // Chuẩn bị dữ liệu insert (chỉ áp dụng khi tạo mới)
    const setOnInsert: any = {
      location_id,
      warehouse_id,
      location_name,
      is_active: true, // Mặc định là active
    };
    if (expected_qty !== undefined) setOnInsert.expected_qty = expected_qty;

    // Upsert: Tạo mới nếu chưa có, giữ nguyên nếu đã tồn tại
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

  /**
   * Cập nhật thông tin một Bin
   * 
   * @param bin_code - Mã bin cần cập nhật
   * @param body - Dữ liệu cập nhật (warehouse_id, location_name, is_active, expected_qty)
   * @returns Thông tin bin sau khi cập nhật
   */
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
    
    // Chỉ cập nhật các field được truyền vào
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

  /**
   * Xóa một Bin khỏi hệ thống
   * 
   * @param bin_code - Mã bin cần xóa
   * @returns { success: boolean }
   */
  async deleteBin(bin_code: string) {
    if (!bin_code) throw new BadRequestException('bin_code required');
    const location_id = bin_code.trim();
    const deleted = await this.storageLocationModel
      .findOneAndDelete({ location_id })
      .lean()
      .exec();
    return { success: !!deleted };
  }

  /**
   * Lấy danh sách Bin Worklist (có phân trang và tìm kiếm)
   * Hiển thị tất cả bins kèm thông tin lô hàng và lần đếm cuối
   * 
   * Quy trình:
   * 1. Lấy danh sách bins (có lọc theo warehouse_id và từ khóa)
   * 2. Aggregate để lấy các lô hàng trong từng bin
   * 3. Lấy ngày đếm cuối cùng cho từng bin
   * 4. Trả về dữ liệu đã enrich
   * 
   * @param warehouse_id - Lọc theo kho (tùy chọn)
   * @param page - Số trang (mặc định: 1)
   * @param limit - Số bản ghi/trang (mặc định: 50)
   * @param q - Từ khóa tìm kiếm theo bin_code hoặc location_name (tùy chọn)
   * @returns { data, total, page, limit }
   */
  async getWorklist(warehouse_id?: string, page = 1, limit = 50, q?: string) {
    // Query bins từ storage_locations collection
    // Hiển thị cả bins chưa có lô hàng nào
    const query: any = { is_active: true };
    if (warehouse_id) query.warehouse_id = warehouse_id;

    // Tìm kiếm theo bin_code hoặc location_name (không phân biệt hoa thường)
    if (q && String(q).trim().length > 0) {
      const term = String(q).trim();
      query.$or = [
        { location_id: { $regex: term, $options: 'i' } },
        { location_name: { $regex: term, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    // Lấy danh sách bins và tổng số bản ghi song song
    const [docs, total] = await Promise.all([
      this.storageLocationModel
        .find(query, {
          location_id: 1,
          warehouse_id: 1,
          location_name: 1,
          modified_date: 1,
        })
        .sort({ location_id: 1 }) // Sắp xếp theo mã bin
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.storageLocationModel.countDocuments(query).exec(),
    ]);

    // Lấy danh sách location_id để aggregate
    const locationIds = (docs || [])
      .map((d: any) => d.location_id)
      .filter(Boolean);
    let lotsMap = new Map<string, any[]>();
    let lastCountMap = new Map<string, any>();

    if (locationIds.length > 0) {
      try {
        // Aggregate: Nhóm các lô hàng theo storage_location
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
        lotsMap = new Map(
          (lotsByLocation || []).map((r: any) => [r._id, r.lots || []]),
        );
      } catch (_) {
        // Bỏ qua lỗi aggregate, trả về mảng rỗng
      }

      try {
        // Lấy ngày đếm cuối cùng cho từng bin
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
        // Bỏ qua lỗi, để ngày cuối là null
      }
    }

    // Enrich dữ liệu trả về
    const data = (docs || []).map((d: any) => ({
      bin_code: d.location_id,
      expected_qty: d.expected_qty ?? undefined,
      warehouse_id: d.warehouse_id ?? undefined,
      location_name: d.location_name ?? undefined,
      // Danh sách lô hàng trong bin
      lots: lotsMap.get(d.location_id) ?? [],
      // Ngày đếm cuối cùng (hoặc null nếu chưa đếm)
      last_count_date: lastCountMap.get(d.location_id) ?? null,
    }));

    return { data, total: total || 0, page, limit };
  }

  /**
   * Lấy chi tiết một Bin và tất cả lô hàng trong bin đó
   * 
   * @param bin_code - Mã bin cần xem chi tiết
   * @returns { bin_code, lots } - Danh sách lô hàng (sắp xếp theo received_date tăng dần)
   */
  async getBinDetails(bin_code: string) {
    if (!bin_code) throw new BadRequestException('bin_code required');
    
    // Aggregate lấy lô hàng trong bin, chỉ lấy các field cần thiết
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
      { $sort: { received_date: 1 } }, // FIFO: nhận trước hiện trước
    ];
    const lots = await this.inventoryLotRepo.aggregate(pipeline);
    return { bin_code, lots };
  }

  /**
   * Gửi kết quả đếm tồn kho tại một bin
   * Đây là quy trình quan trọng nhất trong bin worklist
   * 
   * Quy trình:
   * 1. Lấy số lượng kỳ vọng từ DB (tổng quantity của các lô trong bin)
   * 2. So sánh với số lượng đếm được
   * 3. Tính phần trăm chênh lệch (deltaPct)
   * 4. Nếu chênh lệch >= 50% hoặc bất thường -> flag_review = true
   * 5. Lưu bản ghi đếm vào bin_count_records
   * 6. Cập nhật modified_date của bin
   * 7. Ghi Audit Log
   * 8. Nếu flag_review -> Gửi email thông báo cho tất cả Managers
   * 9. Nếu không flag và AUTO_ADJUST_BIN_COUNT=true -> Tự động tạo Warehouse Slip điều chỉnh
   * 
   * @param bin_code - Mã bin được đếm
   * @param dto - Kết quả đếm (counted_by, notes, entries: lot_id, counted_qty, ...)
   * @returns { success, flag_review, record_id, delta_pct }
   */
  async submitCounts(bin_code: string, dto: SubmitBinCountDto) {
    if (!bin_code) throw new BadRequestException('bin_code required');

    // Bước 1: Lấy số lượng kỳ vọng (expected) từ DB
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

    // Tạo map lô hàng: lot_id -> { expected_qty, material_id }
    const expectedMap = new Map<string, any>();
    for (const l of lots) expectedMap.set(l._id, l);

    // Tính tổng kỳ vọng và tổng đếm được
    let expectedTotal = 0;
    for (const v of expectedMap.values()) expectedTotal += v.expected_qty || 0;
    const countedTotal = dto.entries.reduce(
      (s, e) => s + Number(e.counted_qty || 0),
      0,
    );

    // Bước 2: Tính phần trăm chênh lệch
    const deltaPct =
      expectedTotal === 0
        ? 100 // Nếu không kỳ vọng mà có đếm -> 100% chênh lệch
        : (Math.abs(countedTotal - expectedTotal) / expectedTotal) * 100;

    // Bước 3: Quyết định có cần review không
    const flag_review =
      deltaPct >= 50 || (expectedTotal === 0 && countedTotal > 0);

    // Bước 4: Chuẩn bị dữ liệu lưu trữ
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

    // Bước 5: Lưu bản ghi đếm
    const record = await this.binCountRepo.create(recordData as any);

    // Bước 6: Cập nhật modified_date của bin
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
      // Bỏ qua lỗi cập nhật
    }

    // Bước 7: Ghi Audit Log
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

    // Bước 8: Thông báo cho Manager nếu có flag_review
    if (flag_review) {
      // Lấy danh sách tất cả Managers để gửi email
      try {
        const mgrPage = await this.userService.findByRole(
          UserRole.MANAGER,
          1,
          1000, // Lấy tối đa 1000 managers
        );
        if (mgrPage && mgrPage.data && mgrPage.data.length > 0) {
          const emails = mgrPage.data
            .map((u: any) => u.email)
            .filter(Boolean) as string[];
          // Gửi email cho từng Manager (best-effort)
          for (const em of emails) {
            try {
              await this.mailService.sendBinFlagEmail(
                em,
                bin_code,
                Math.round(deltaPct * 100) / 100,
                String(record._id),
                countedTotal,
                expectedTotal,
              );
            } catch (_) {
              // Bỏ qua lỗi gửi email cho từng người
            }
          }
        }
      } catch (_) {
        // Bỏ qua lỗi tìm kiếm Manager
      }
    }

    // Bước 9: Tự động tạo Warehouse Slip điều chỉnh nếu bật AUTO_ADJUST_BIN_COUNT
    const autoAdjust =
      (
        this.configService.get<string>('AUTO_ADJUST_BIN_COUNT') || ''
      ).toLowerCase() === 'true';
    
    if (!flag_review && autoAdjust) {
      // Lấy thông tin lô hàng để biết warehouse_id và unit_of_measure
      const lotIds = dto.entries
        .map((e) => e.lot_id)
        .filter(Boolean) as string[];
      const lotsInfo = await this.inventoryLotRepo.findByLotIds(lotIds);
      const lotMap = new Map(lotsInfo.map((l: any) => [l.lot_id, l]));

      // Tạo điều chỉnh cho từng lô có chênh lệch
      for (const e of dto.entries) {
        const expected = expectedMap.get(e.lot_id ?? '')?.expected_qty ?? 0;
        const diff = Number(e.counted_qty || 0) - expected;
        if (!e.lot_id || diff === 0) continue; // Bỏ qua nếu không có lot_id hoặc không chênh lệch

        const lot = lotMap.get(e.lot_id) as any;
        const warehouse_id =
          lot?.warehouse_id ||
          this.configService.get<string>('DEFAULT_WAREHOUSE_ID');
        if (!warehouse_id) continue;

        // Quyết định loại phiếu: IN (thừa) hoặc OUT (thiếu)
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
          // Bỏ qua lỗi tạo phiếu
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

  /**
   * Lấy lịch sử đếm tồn kho của một bin (có phân trang)
   * Enrich dữ liệu với tên vật tư và đơn vị tính
   * 
   * @param bin_code - Mã bin
   * @param page - Số trang (mặc định: 1)
   * @param limit - Số bản ghi/trang (mặc định: 20)
   * @returns { data, total, page, limit } - Dữ liệu đã enrich
   */
  async getBinCounts(bin_code: string, page = 1, limit = 20) {
    if (!bin_code) throw new BadRequestException('bin_code required');
    
    // Lấy lịch sử đếm từ repository
    const { data, total } = await this.binCountRepo.findByBin(
      bin_code,
      page,
      limit,
    );

    // Thu thập tất cả material_ids và lot_ids để enrich
    const materialIds = new Set<string>();
    const lotIds = new Set<string>();
    for (const r of data || []) {
      for (const e of r.entries || []) {
        if (e.material_id) materialIds.add(e.material_id);
        if (e.lot_id) lotIds.add(e.lot_id);
      }
    }

    // Lấy thông tin vật tư và lô hàng song song
    const [materials, lotsInfo] = await Promise.all([
      this.materialRepo.findByMaterialIds(Array.from(materialIds)),
      this.inventoryLotRepo.findByLotIds(Array.from(lotIds)),
    ]);

    // Tạo Map để tra cứu nhanh
    const materialMap = new Map(
      (materials || []).map((m: any) => [m.material_id, m]),
    );
    const lotMap = new Map((lotsInfo || []).map((l: any) => [l.lot_id, l]));

    // Enrich dữ liệu trả về
    const transformed = (data || []).map((r: any) => {
      // Tính lại tổng kỳ vọng và tổng đếm được cho từng bản ghi
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
    const locationIds = (docs || [])
      .map((d: any) => d.location_id)
      .filter(Boolean);
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
        lotsMap = new Map(
          (lotsByLocation || []).map((r: any) => [r._id, r.lots || []]),
        );
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
      warehouse_id: d.warehouse_id ?? undefined,
      location_name: d.location_name ?? undefined,
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
      // Prefer explicit config value, fallback to first active Manager user in DB
      try {
        // fetch all managers (no small limit)
        const mgrPage = await this.userService.findByRole(
          UserRole.MANAGER,
          1,
          1000,
        );
        if (mgrPage && mgrPage.data && mgrPage.data.length > 0) {
          const emails = mgrPage.data
            .map((u: any) => u.email)
            .filter(Boolean) as string[];
          // send to each manager email (best-effort)
          for (const em of emails) {
            try {
              await this.mailService.sendBinFlagEmail(
                em,
                bin_code,
                Math.round(deltaPct * 100) / 100,
                String(record._id),
                countedTotal,
                expectedTotal,
              );
            } catch (_) {
              // ignore per-recipient errors
            }
          }
        }
      } catch (_) {
        // ignore lookup errors and fall through
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
