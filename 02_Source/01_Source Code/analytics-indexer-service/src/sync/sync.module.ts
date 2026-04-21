import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryLot, InventoryLotSchema } from '../schemas/inventory-lot.schema';
import { InventoryTransaction, InventoryTransactionSchema } from '../schemas/inventory-transaction.schema';
import { QCTest, QCTestSchema } from '../schemas/qc-test.schema';
import { Material, MaterialSchema } from '../schemas/material.schema';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import { ImportExportOrder, ImportExportOrderSchema } from '../schemas/import-export-order.schema';
import { InventoryLotsSync } from './collections/inventory-lots.sync';
import { InventoryTransactionsSync } from './collections/inventory-transactions.sync';
import { QCTestsSync } from './collections/qc-tests.sync';
import { MaterialsSync } from './collections/materials.sync';
import { AuditLogsSync } from './collections/audit-logs.sync';
import { ImportExportOrdersSync } from './collections/import-export-orders.sync';
import { MarkdownKnowledgeSync } from './collections/markdown-knowledge.sync';
import { SyncService } from './sync.service';
import { SyncScheduler } from './sync.scheduler';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: QCTest.name, schema: QCTestSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: ImportExportOrder.name, schema: ImportExportOrderSchema },
    ]),
  ],
  providers: [
    InventoryLotsSync,
    InventoryTransactionsSync,
    QCTestsSync,
    MaterialsSync,
    AuditLogsSync,
    ImportExportOrdersSync,
    MarkdownKnowledgeSync,
    SyncService,
    SyncScheduler,
  ],
})
export class SyncModule {}
