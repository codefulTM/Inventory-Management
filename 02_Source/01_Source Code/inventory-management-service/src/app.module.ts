import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { CommonAuthModule } from './common/auth/common-auth.module';
import { UserModule } from './user/user.module';
import { MaterialModule } from './material/material.module';
import { InventoryLotModule } from './inventory-lot/inventory-lot.module';
import { ProductionBatchModule } from './production-batch/production-batch.module';
import { InventoryTransactionModule } from './inventory-transaction/inventory-transaction.module';
import { QCTestModule } from './qc-test/qc-test.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { LabelTemplateModule } from './label-template/label-template.module';
import { WarehouseHierarchyModule } from './warehouse-hierarchy/warehouse-hierarchy.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { SystemMonitoringModule } from './system-monitoring/system-monitoring.module';
import { LogModule } from './log-management/log.module';
import { BarcodeModule } from './barcode/barcode.module';
import { MetricsModule } from './metrics/metrics.module';
import { AppService } from './app.service';
import { ImportExportOrderModule } from './import-export-order/import-export-order.module';
import { WarehouseSlipModule } from './warehouse-slip/warehouse-slip.module';
import { InventoryAdjustmentModule } from './inventory-adjustment/inventory-adjustment.module';
import { InventoryAuditReportModule } from './inventory-audit-report/inventory-audit-report.module';
import { AiDataGrpcModule } from './ai-data-grpc/ai-data-grpc.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RedisIdModule } from './redis-id/redis-id.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CommonAuthModule,
    UserModule,
    MaterialModule,
    InventoryLotModule,
    ProductionBatchModule,
    InventoryTransactionModule,
    QCTestModule,
    LabelTemplateModule,
    ImportExportOrderModule,
    WarehouseSlipModule,
    InventoryAdjustmentModule,
    InventoryAuditReportModule,
    WarehouseModule,
    WarehouseHierarchyModule,
    SystemMonitoringModule,
    LogModule,
    BarcodeModule,
    MetricsModule,
    DashboardModule,
    AuditLogModule,
    AiDataGrpcModule,
    RedisIdModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Áp dụng JwtAuthGuard và RolesGuard cho toàn bộ routes
    // Route nào muốn bỏ qua dùng @Public() decorator
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
