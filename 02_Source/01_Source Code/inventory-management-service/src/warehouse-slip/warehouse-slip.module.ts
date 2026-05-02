/**
 * WarehouseSlipModule - Module quản lý phiếu nhập/xuất kho
 *
 * Chức năng:
 * - Quản lý phiếu nhập kho (receiving slip) và xuất kho (issuing slip)
 * - Workflow: Draft → Pending → Approved/Rejected → Completed
 * - Gắn đính kèm tài liệu (attachments) cho phiếu
 * - Từ chối phiếu với lý do (reject with reason)
 * - Tự động tạo giao dịch tồn kho khi phê duyệt phiếu
 * - Ghi log kiểm toán cho mọi thay đổi phiếu
 *
 * Phụ thuộc:
 * - MaterialModule, InventoryTransactionModule, InventoryLotModule
 * - AuditLogModule (ghi log)
 * - forwardRef(InventoryLotModule) để tránh circular dependency
 */
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WarehouseSlip,
  WarehouseSlipSchema,
} from '../schemas/warehouse-slip.schema';
import { Warehouse, WarehouseSchema } from '../schemas/warehouse.schema';
import { WarehouseSlipController } from './warehouse-slip.controller';
import { WarehouseSlipService } from './warehouse-slip.service';
import { WarehouseSlipRepository } from './warehouse-slip.repository';
import { MaterialModule } from '../material/material.module';
import { InventoryTransactionModule } from '../inventory-transaction/inventory-transaction.module';
import { InventoryLotModule } from '../inventory-lot/inventory-lot.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WarehouseSlip.name, schema: WarehouseSlipSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
    ]),
    MaterialModule,
    InventoryTransactionModule,
    forwardRef(() => InventoryLotModule),
    AuditLogModule,
  ],
  controllers: [WarehouseSlipController],
  providers: [WarehouseSlipService, WarehouseSlipRepository],
  exports: [WarehouseSlipService],
})
export class WarehouseSlipModule {}
