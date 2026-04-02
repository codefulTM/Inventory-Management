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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImportExportOrder.name, schema: ImportExportOrderSchema },
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    ]),
  ],
  controllers: [ImportExportOrderController],
  providers: [ImportExportOrderRepository, ImportExportOrderService],
  exports: [ImportExportOrderService],
})
export class ImportExportOrderModule {}
