import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';
import {
  BinCountRecord,
  BinCountRecordSchema,
} from '../schemas/bin-count-record.schema';
import { InventoryLotController } from './inventory-lot.controller';
import { InventoryLotService } from './inventory-lot.service';
import { InventoryLotRepository } from './inventory-lot.repository';
import { InventoryTransactionModule } from '../inventory-transaction/inventory-transaction.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: BinCountRecord.name, schema: BinCountRecordSchema },
    ]),
    InventoryTransactionModule,
    AuditLogModule,
  ],
  controllers: [InventoryLotController],
  providers: [InventoryLotService, InventoryLotRepository],
  exports: [InventoryLotService, InventoryLotRepository],
})
export class InventoryLotModule {}
