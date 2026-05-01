import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InventoryAdjustment,
  InventoryAdjustmentSchema,
} from '../schemas/inventory-adjustment.schema';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from '../schemas/inventory-transaction.schema';
import {
  InventoryValuationSummary,
  InventoryValuationSummarySchema,
} from '../schemas/inventory-valuation-summary.schema';
import { InventoryAdjustmentController } from './inventory-adjustment.controller';
import { InventoryAdjustmentService } from './inventory-adjustment.service';
import { InventoryAdjustmentRepository } from './inventory-adjustment.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryAdjustment.name, schema: InventoryAdjustmentSchema },
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      {
        name: InventoryValuationSummary.name,
        schema: InventoryValuationSummarySchema,
      },
    ]),
  ],
  controllers: [InventoryAdjustmentController],
  providers: [InventoryAdjustmentService, InventoryAdjustmentRepository],
})
export class InventoryAdjustmentModule {}
