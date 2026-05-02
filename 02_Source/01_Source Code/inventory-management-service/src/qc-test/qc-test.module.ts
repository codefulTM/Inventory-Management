/**
 * QCTestModule - Module quản lý kiểm tra chất lượng (Quality Control)
 *
 * Chức năng chính:
 * - Quản lý các bài kiểm tra chất lượng (QC tests) cho lô hàng và lô sản xuất
 * - Hỗ trợ nhiều loại test: Identity, Potency, Microbial, Physical, Chemical
 * - Theo dõi kết quả: Pass/Fail/Pending và trạng thái Compliant/Out of spec
 * - Quản lý lô bị cách ly (quarantine) và quyết định xử lý (retest decision)
 * - Bulk quarantine - cách ly hàng loạt nhiều lô
 * - Dashboard KPI và thống kê hiệu suất nhà cung cấp
 *
 * Phụ thuộc:
 * - InventoryLotModule: Cập nhật trạng thái lô sau khi QC
 * - ProductionBatchModule: QC test liên quan đến lô sản xuất
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QCTest, QCTestSchema } from '../schemas/qc-test.schema';
import { QCTestController } from './qc-test.controller';

import { QCTestService } from './qc-test.service';
import { QCTestRepository } from './qc-test.repository';
import { InventoryLotModule } from '../inventory-lot/inventory-lot.module';
import { ProductionBatchModule } from '../production-batch/production-batch.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: QCTest.name, schema: QCTestSchema }]),
    InventoryLotModule,
    ProductionBatchModule,
  ],
  controllers: [QCTestController],
  providers: [QCTestService, QCTestRepository],
  exports: [QCTestService],
})
export class QCTestModule {}
