import { Module, forwardRef } from '@nestjs/common';
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
import { BinWorklistController } from './bin-worklist.controller';
import { BinWorklistService } from './bin-worklist.service';
import { BinCountRecordRepository } from './bin-count-record.repository';
import { InventoryTransactionModule } from '../inventory-transaction/inventory-transaction.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { WarehouseSlipModule } from '../warehouse-slip/warehouse-slip.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: BinCountRecord.name, schema: BinCountRecordSchema },
    ]),
    InventoryTransactionModule,
    AuditLogModule,
    forwardRef(() => WarehouseSlipModule),
    MailModule,
  ],
  controllers: [InventoryLotController, BinWorklistController],
  providers: [
    InventoryLotService,
    InventoryLotRepository,
    BinCountRecordRepository,
    BinWorklistService,
  ],
  exports: [InventoryLotService, InventoryLotRepository, BinWorklistService],
})
export class InventoryLotModule {}
