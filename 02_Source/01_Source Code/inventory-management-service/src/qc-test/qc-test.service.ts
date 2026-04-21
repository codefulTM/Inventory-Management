import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QCTestRepository } from './qc-test.repository';
import { QCTest, QCTestDocument } from '../schemas/qc-test.schema';
import { RedisIdService } from '../redis-id/redis-id.service';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../schemas/inventory-lot.schema';
import { CreateQCTestDto } from './dto/create-qc-test.dto';
import { UpdateQCTestDto } from './dto/update-qc-test.dto';
import { QCDecisionDto } from './dto/qc-decision.dto';
import {
  InventoryLotStatus,
  InventoryLotResponseDto,
} from '../inventory-lot/inventory-lot.dto';
import { InventoryLotService } from '../inventory-lot/inventory-lot.service';
import { ProductionBatchService } from '../production-batch/production-batch.service';

@Injectable()
export class QCTestService {
  constructor(
    private readonly repository: QCTestRepository,
    private readonly inventoryLotService: InventoryLotService,
    private readonly productionBatchService: ProductionBatchService,
    private readonly redisIdService: RedisIdService,
  ) {}

  // ─── InventoryLotService helpers ─────────────────────────────────────

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async getAllTests(filter?: {
    result_status?: string;
    test_type?: string;
  }): Promise<QCTestDocument[]> {
    return this.repository.findAll(filter);
  }

  async getTestById(test_id: string): Promise<QCTestDocument> {
    const test = await this.repository.findByTestId(test_id);
    if (!test) {
      throw new NotFoundException(`QCTest '${test_id}' not found`);
    }
    return test;
  }

  async getTestsByLotId(lot_id: string): Promise<QCTestDocument[]> {
    await this.inventoryLotService.findById(lot_id); // validate lot exists
    return this.repository.findByLotId(lot_id);
  }

  async createTest(dto: CreateQCTestDto): Promise<QCTestDocument> {
    await this.inventoryLotService.findById(dto.lot_id); // validate lot exists

    const data: Partial<QCTest> = {
      ...dto,
      test_id: await this.redisIdService.nextId('QC'),
      test_date: new Date(dto.test_date),
      result_status: dto.result_status ?? 'Pending',
    };

    return this.repository.create(data);
  }

  async initTestFromBatch(
    batch_id: string,
    dto: {
      performed_by: string;
      test_type?: CreateQCTestDto['test_type'];
      test_method?: string;
      acceptance_criteria?: string;
    },
  ): Promise<QCTestDocument> {
    if (!dto.performed_by?.trim()) {
      throw new BadRequestException('performed_by is required');
    }

    const batch = await this.productionBatchService.findOne(batch_id);

    const lotSearch = await this.inventoryLotService.search(
      batch.batch_number,
      1,
      20,
    );

    const lot = lotSearch.data.find(
      (item) =>
        item.manufacturer_lot === batch.batch_number &&
        item.material_id === batch.product_id,
    );

    if (!lot) {
      throw new NotFoundException(
        `Finished inventory lot for batch '${batch_id}' not found`,
      );
    }

    const existed = await this.repository.findByLotId(lot.lot_id);
    const hasPendingBatchQC = existed.some(
      (test) =>
        test.result_status === 'Pending' &&
        test.test_method === 'Batch Completion QC',
    );

    if (hasPendingBatchQC) {
      throw new BadRequestException(
        `Pending QC test already exists for batch '${batch_id}'`,
      );
    }

    return this.createTest({
      lot_id: lot.lot_id,
      test_type: dto.test_type ?? 'Physical',
      test_method: dto.test_method ?? 'Batch Completion QC',
      test_date: new Date().toISOString(),
      test_result: `Pending QC test for completed batch ${batch.batch_number}`,
      acceptance_criteria:
        dto.acceptance_criteria ?? 'Internal batch release criteria',
      result_status: 'Pending',
      performed_by: dto.performed_by,
    });
  }

  async updateTest(
    test_id: string,
    dto: UpdateQCTestDto,
  ): Promise<QCTestDocument> {
    const updated = await this.repository.updateByTestId(
      test_id,
      dto as Partial<QCTest>,
    );
    if (!updated) {
      throw new NotFoundException(`QCTest '${test_id}' not found`);
    }
    return updated;
  }

  async deleteTest(test_id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.repository.deleteByTestId(test_id);
    if (!deleted) {
      throw new NotFoundException(`QCTest '${test_id}' not found`);
    }
    return { deleted: true };
  }

  // ─── Workflow ────────────────────────────────────────────────────────────

  async submitDecision(
    lot_id: string,
    dto: QCDecisionDto,
  ): Promise<{ lot: InventoryLotResponseDto; tests: QCTestDocument[] }> {
    await this.inventoryLotService.findById(lot_id); // validate lot exists

    if (dto.decision === 'Rejected' && !dto.reject_reason?.trim()) {
      throw new BadRequestException(
        'Lý do từ chối là bắt buộc khi quyết định là Rejected',
      );
    }

    const testResultStatus =
      dto.decision === 'Accepted'
        ? 'Pass'
        : dto.decision === 'Rejected'
          ? 'Fail'
          : 'Pending';

    const updateData: Partial<QCTest> = {
      result_status: testResultStatus,
      verified_by: dto.verified_by,
      ...(dto.reject_reason && { reject_reason: dto.reject_reason }),
      ...(dto.label_id && { label_id: dto.label_id }),
    };

    const tests = await this.repository.updateManyByLotId(
      lot_id,
      { result_status: 'Pending' },
      updateData,
    );

    const lotStatus: InventoryLotStatus =
      dto.decision === 'Accepted'
        ? InventoryLotStatus.ACCEPTED
        : dto.decision === 'Rejected'
          ? InventoryLotStatus.REJECTED
          : InventoryLotStatus.QUARANTINE;

    // Chỉ update status bằng hàm chuyên dụng
    const lot = await this.inventoryLotService.updateStatus(lot_id, lotStatus);

    return { lot, tests };
  }

  async submitRetestDecision(
    lot_id: string,
    action: 'extend' | 'discard',
    dto: { new_expiry_date?: string; performed_by: string },
  ): Promise<InventoryLotResponseDto> {
    await this.inventoryLotService.findById(lot_id); // validate lot exists

    if (!['extend', 'discard'].includes(action)) {
      throw new BadRequestException(
        'action không hợp lệ. Chỉ chấp nhận: extend hoặc discard',
      );
    }

    if (!dto.performed_by?.trim()) {
      throw new BadRequestException('performed_by is required');
    }

    if (action === 'extend') {
      if (!dto.new_expiry_date) {
        throw new BadRequestException(
          'new_expiry_date là bắt buộc khi action = extend',
        );
      }

      const parsedNewExpiryDate = new Date(dto.new_expiry_date);
      if (Number.isNaN(parsedNewExpiryDate.getTime())) {
        throw new BadRequestException(
          'new_expiry_date phải là ngày hợp lệ theo chuẩn ISO 8601',
        );
      }
      if (parsedNewExpiryDate.getTime() <= Date.now()) {
        throw new BadRequestException(
          'new_expiry_date phải lớn hơn thời điểm hiện tại',
        );
      }

      const lot = await this.inventoryLotService.update(lot_id, {
        expiration_date: parsedNewExpiryDate,
        status: InventoryLotStatus.ACCEPTED,
      });

      await this.repository.create({
        test_id: await this.redisIdService.nextId('QC'),
        lot_id,
        test_type: 'Physical',
        test_method: 'Re-test',
        test_date: new Date(),
        test_result: 'Re-test after expiry extension',
        result_status: 'Pass',
        performed_by: dto.performed_by,
      });

      return lot;
    } else {
      const lot = await this.inventoryLotService.updateStatus(
        lot_id,
        InventoryLotStatus.DEPLETED,
      );

      await this.repository.create({
        test_id: await this.redisIdService.nextId('QC'),
        lot_id,
        test_type: 'Physical',
        test_method: 'Re-test - Discard',
        test_date: new Date(),
        test_result: 'Discarded after re-test',
        result_status: 'Fail',
        performed_by: dto.performed_by,
      });

      return lot;
    }
  }

  // ─── Dashboard & Reporting ────────────────────────────────────────────────

  async getDashboardKPI(): Promise<{
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    error_rate: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let quarantineLots: { data: any[] } = { data: [] };
    let approved_count = 0;
    let rejected_count = 0;
    try {
      [quarantineLots, approved_count, rejected_count] = await Promise.all([
        this.inventoryLotService.findByStatus('Quarantine'),
        this.repository.countByResultStatus('Pass', startOfMonth, now),
        this.repository.countByResultStatus('Fail', startOfMonth, now),
      ]);
    } catch (e) {
      // fallback nếu có lỗi
      quarantineLots = { data: [] };
      approved_count = 0;
      rejected_count = 0;
    }

    const total = approved_count + rejected_count;
    const error_rate = total > 0 ? (rejected_count / total) * 100 : 0;

    // Đảm bảo luôn trả về đủ 4 trường, default = 0 nếu thiếu
    // Xử lý mọi trường hợp trả về: object có data, mảng, hoặc undefined
    let pending_count = 0;
    if (quarantineLots && typeof quarantineLots === 'object') {
      if (Array.isArray(quarantineLots)) {
        pending_count = quarantineLots.length;
      } else if (
        'data' in quarantineLots &&
        Array.isArray(quarantineLots.data)
      ) {
        pending_count = quarantineLots.data.length;
      }
    }
    return {
      pending_count,
      approved_count: typeof approved_count === 'number' ? approved_count : 0,
      rejected_count: typeof rejected_count === 'number' ? rejected_count : 0,
      error_rate:
        typeof error_rate === 'number' ? Math.round(error_rate * 100) / 100 : 0,
    };
  }

  async getSupplierPerformance(filter?: {
    from?: string;
    to?: string;
  }): Promise<
    Array<{
      supplier_name: string;
      total_batches: number;
      approved: number;
      rejected: number;
      quality_rate: number;
    }>
  > {
    const from = filter?.from ? new Date(filter.from) : undefined;
    const to = filter?.to ? new Date(filter.to) : undefined;

    const tests = await this.repository.findInDateRange(from, to);
    if (tests.length === 0) return [];

    const uniqueLotIds = [...new Set(tests.map((t) => t.lot_id))];
    // Không có findByIds, dùng Promise.all(findById)
    const lotsArr = await Promise.all(
      uniqueLotIds.map((id) => this.inventoryLotService.findById(id)),
    );
    const lotMap = new Map(lotsArr.map((l) => [l.lot_id, l]));

    const supplierMap = new Map<
      string,
      { total_batches: number; approved: number; rejected: number }
    >();

    for (const test of tests) {
      const lot = lotMap.get(test.lot_id) || {};
      const name =
        (lot as any).supplier_name ??
        (lot as any).manufacturer_name ??
        'Unknown';
      if (!supplierMap.has(name)) {
        supplierMap.set(name, { total_batches: 0, approved: 0, rejected: 0 });
      }
      const entry = supplierMap.get(name)!;
      entry.total_batches += 1;
      if (test.result_status === 'Pass') entry.approved += 1;
      if (test.result_status === 'Fail') entry.rejected += 1;
    }

    return Array.from(supplierMap.entries()).map(([supplier_name, data]) => {
      const total = data.approved + data.rejected;
      const quality_rate =
        total > 0 ? Math.round((data.approved / total) * 100 * 100) / 100 : 0;
      return { supplier_name, ...data, quality_rate };
    });
  }
}
