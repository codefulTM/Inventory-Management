import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WarehouseHierarchyService } from './warehouse-hierarchy.service';
import { WarehouseHierarchyController } from './warehouse-hierarchy.controller';
import {
  WarehouseLocation,
  WarehouseLocationSchema,
} from '../schemas/warehouse-location.schema';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WarehouseLocation.name, schema: WarehouseLocationSchema },
      { name: InventoryLot.name, schema: InventoryLotSchema },
    ]),
  ],
  controllers: [WarehouseHierarchyController],
  providers: [WarehouseHierarchyService],
  exports: [WarehouseHierarchyService],
})
export class WarehouseHierarchyModule {}
