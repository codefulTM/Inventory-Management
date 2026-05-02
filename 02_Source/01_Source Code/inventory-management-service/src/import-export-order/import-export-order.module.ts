/**
 * ImportExportOrderModule - Module quản lý đơn đặt hàng nhập/xuất
 *
 * Chức năng:
 * - Quản lý đơn đặt hàng nhập kho (Inbound) từ nhà cung cấp
 * - Quản lý đơn đặt hàng xuất kho (Outbound) cho khách hàng
 * - Workflow: PendingConfirmation → Confirmed → Rejected
 * - Hỗ trợ đính kèm tài liệu (attachments) cho đơn hàng
 * - Blind count requirement - yêu cầu đếm mù khi nhận hàng
 * - Tự động tạo giao dịch tồn kho khi xác nhận đơn hàng
 *
 * Schema đăng ký:
 * - ImportExportOrder: Đơn đặt hàng
 * - Counter: Tạo số đơn tự động
 * - Warehouse, StorageLocation: Validate vị trí kho
 * - Material, InventoryLot, InventoryTransaction: Thao tác tồn kho
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportExportOrderController } from './import-export-order.controller';
import { ImportExportOrderRepository } from './import-export-order.repository';
import { ImportExportOrderService } from './import-export-order.service';
import {
  ImportExportOrder,
  ImportExportOrderSchema,
} from '../schemas/import-export-order.schema';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';
import { Material, MaterialSchema } from '../schemas/material.schema';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from '../schemas/inventory-transaction.schema';
import { Counter, CounterSchema } from '../schemas/counter.schema';
import { Warehouse, WarehouseSchema } from '../schemas/warehouse.schema';
import {
  StorageLocation,
  StorageLocationSchema,
} from '../schemas/storage-location.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImportExportOrder.name, schema: ImportExportOrderSchema },
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: StorageLocation.name, schema: StorageLocationSchema },
    ]),
  ],
  controllers: [ImportExportOrderController],
  providers: [ImportExportOrderRepository, ImportExportOrderService],
  exports: [ImportExportOrderService],
})
export class ImportExportOrderModule {}
