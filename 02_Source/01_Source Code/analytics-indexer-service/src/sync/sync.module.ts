/**
 * File: sync/sync.module.ts
 * Mục đích: Module quản lý tất cả các thành phần đồng bộ dữ liệu
 * 
 * Module này đăng ký:
 * - Các Mongoose models cho 7 collections cần đồng bộ
 * - 7 Sync services cho từng collection
 * - SyncService tổng để điều phối đồng bộ
 * - SyncScheduler để chạy đồng bộ định kỳ (cron job)
 * 
 * Các collections được đồng bộ:
 * 1. inventory_lots - Lô hàng
 * 2. inventory_transactions - Giao dịch kho
 * 3. qc_tests - Kiểm tra chất lượng
 * 4. materials - Vật tư
 * 5. audit_logs -> inventory_audit_reports - Nhật ký hệ thống
 * 6. import_export_orders - Đơn nhập/xuất
 * 7. docs_knowledge - Tài liệu Markdown (không qua MongoDB)
 */
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
    // Đăng ký Mongoose models cho các collections cần đồng bộ
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
    // 7 Sync services cho từng collection
    InventoryLotsSync,
    InventoryTransactionsSync,
    QCTestsSync,
    MaterialsSync,
    AuditLogsSync,
    ImportExportOrdersSync,
    MarkdownKnowledgeSync,  // Không cần Mongoose model (đọc file Markdown)
    
    // Service tổng điều phối đồng bộ
    SyncService,
    
    // Scheduler chạy đồng bộ định kỳ (cron)
    SyncScheduler,
  ],
})
export class SyncModule {}
