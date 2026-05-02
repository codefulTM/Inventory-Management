import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProductionBatch,
  ProductionBatchSchema,
} from '../schemas/production-batch.schema';
import {
  BatchComponent,
  BatchComponentSchema,
} from '../schemas/batch-component.schema';
import { Material, MaterialSchema } from '../schemas/material.schema';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from '../schemas/inventory-transaction.schema';
import { ProductionBatchController } from './production-batch.controller';
import { ProductionBatchService } from './production-batch.service';
import { ProductionBatchRepository } from './production-batch.repository';
import { BatchComponentService } from './batch-component.service';
import { BatchComponentRepository } from './batch-component.repository';
import { InventoryLotModule } from '../inventory-lot/inventory-lot.module';
import { InventoryLotRepository } from '../inventory-lot/inventory-lot.repository';

/**
 * ProductionBatchModule - Module quản lý lô sản xuất
 * 
 * Chức năng chính:
 * - Quản lý quy trình sản xuất từ nguyên liệu thành thành phẩm
 * - Theo dõi các lô sản xuất (batches) và trạng thái (InProgress, Complete, OnHold, Cancelled)
 * - Quản lý các thành phần (components) cấu tạo nên lô sản xuất
 * - Tự động trừ kho nguyên liệu khi hoàn thành lô (status → Complete)
 * - Tự động tạo lô thành phẩm (inventory lot) sau khi sản xuất xong
 * - Tính toán hạn sử dụng dựa trên shelf_life của thành phẩm
 * 
 * Quy trình sản xuất (Batch Workflow):
 * 1. Tạo batch (status: OnHold/InProgress)
 * 2. Thêm các thành phần (nguyên liệu từ inventory lots)
 * 3. Kiểm tra tồn kho đủ cho các thành phần
 * 4. Cập nhật status → Complete
 * 5. Tự động: Trừ kho nguyên liệu + Tạo lô thành phẩm (Quarantine)
 * 
 * Model đăng ký:
 * - ProductionBatch: Thông tin lô sản xuất
 * - BatchComponent: Các thành phần (nguyên liệu) của lô
 * - Material: Để validate product_id
 * - InventoryLot: Để trừ kho và tạo lô thành phẩm
 * - InventoryTransaction: Để ghi nhận giao dịch trừ kho
 * 
 * Module phụ thuộc:
 * - InventoryLotModule: Để thao tác với inventory lots (trừ kho, tạo lô mới)
 * - InventoryLotRepository: Để truy vấn lot trực tiếp
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductionBatch.name, schema: ProductionBatchSchema },
      { name: BatchComponent.name, schema: BatchComponentSchema },
      // Cross-references needed by services for FK validation
      { name: Material.name, schema: MaterialSchema },
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    ]),
    InventoryLotModule,
  ],
  controllers: [ProductionBatchController],
  providers: [
    ProductionBatchRepository,
    BatchComponentRepository,
    InventoryLotRepository,
    ProductionBatchService,
    BatchComponentService,
  ],
  // Export để các module khác có thể sử dụng
  exports: [ProductionBatchService, BatchComponentService],
})
export class ProductionBatchModule {}
