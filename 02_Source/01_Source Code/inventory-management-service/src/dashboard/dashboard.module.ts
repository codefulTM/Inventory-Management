/**
 * DashboardModule - Module cung cấp API tổng hợp dữ liệu cho Dashboard
 *
 * Chức năng:
 * - Tổng hợp thống kê tồn kho, giao dịch, phiếu nhập/xuất
 * - Cung cấp dữ liệu cho các biểu đồ và widget trên dashboard
 * - Truy vấn trực tiếp từ nhiều collections (transactions, lots, slips, warehouses)
 * - Không có repository riêng, query trực tiếp qua Mongoose
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from '../schemas/inventory-transaction.schema';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';
import {
  InventoryValuationSummary,
  InventoryValuationSummarySchema,
} from '../schemas/inventory-valuation-summary.schema';
import {
  WarehouseSlip,
  WarehouseSlipSchema,
} from '../schemas/warehouse-slip.schema';
import { Warehouse, WarehouseSchema } from '../schemas/warehouse.schema';
import { MaterialModule } from '../material/material.module';
import { InventoryLotRepository } from '../inventory-lot/inventory-lot.repository';
import { InventoryTransactionRepository } from '../inventory-transaction/inventory-transaction.repository';
import { WarehouseSlipRepository } from '../warehouse-slip/warehouse-slip.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: WarehouseSlip.name, schema: WarehouseSlipSchema },
    ]),
    MaterialModule,
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    InventoryLotRepository,
    InventoryTransactionRepository,
    WarehouseSlipRepository,
  ],
})
export class DashboardModule {}
