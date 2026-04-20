import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './repositories/reports.repository';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
} from '../schemas/inventory-transaction.schema';
import { QCTest, QCTestSchema } from '../schemas/qc-test.schema';
import { AuditLog, AuditLogSchema } from '../audit-log/audit-log.schema';
import { Material, MaterialSchema } from '../schemas/material.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: QCTest.name, schema: QCTestSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Material.name, schema: MaterialSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
})
export class ReportsModule {}
