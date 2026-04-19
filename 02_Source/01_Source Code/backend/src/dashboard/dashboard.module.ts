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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: InventoryLot.name, schema: InventoryLotSchema },
      {
        name: InventoryValuationSummary.name,
        schema: InventoryValuationSummarySchema,
      },
      { name: WarehouseSlip.name, schema: WarehouseSlipSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
