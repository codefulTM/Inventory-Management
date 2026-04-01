import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BarcodeService } from './barcode.service';
import { BarcodeController } from './barcode.controller';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryLot.name, schema: InventoryLotSchema },
    ]),
  ],
  controllers: [BarcodeController],
  providers: [BarcodeService],
  exports: [BarcodeService],
})
export class BarcodeModule {}
