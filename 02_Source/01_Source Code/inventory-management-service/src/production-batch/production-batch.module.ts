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
  exports: [ProductionBatchService, BatchComponentService],
})
export class ProductionBatchModule {}
