import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WarehouseSlip,
  WarehouseSlipSchema,
} from '../schemas/warehouse-slip.schema';
import { Warehouse, WarehouseSchema } from '../schemas/warehouse.schema';
import { WarehouseSlipController } from './warehouse-slip.controller';
import { WarehouseSlipService } from './warehouse-slip.service';
import { WarehouseSlipRepository } from './warehouse-slip.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WarehouseSlip.name, schema: WarehouseSlipSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
    ]),
  ],
  controllers: [WarehouseSlipController],
  providers: [WarehouseSlipService, WarehouseSlipRepository],
  exports: [WarehouseSlipService],
})
export class WarehouseSlipModule {}
