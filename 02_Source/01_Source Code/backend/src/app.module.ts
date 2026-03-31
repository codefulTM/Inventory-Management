import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { KeycloakModule } from './keycloak/keycloak.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MaterialModule } from './material/material.module';
import { InventoryLotModule } from './inventory-lot/inventory-lot.module';
import { ProductionBatchModule } from './production-batch/production-batch.module';
import { InventoryTransactionModule } from './inventory-transaction/inventory-transaction.module';
import { QCTestModule } from './qc-test/qc-test.module';
import { AiModule } from './ai/ai.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { LabelTemplateModule } from './label-template/label-template.module';
import { WarehouseHierarchyModule } from './warehouse-hierarchy/warehouse-hierarchy.module';
import { SystemMonitoringModule } from './system-monitoring/system-monitoring.module';
import { LogModule } from './log-management/log.module';
import { BarcodeModule } from './barcode/barcode.module';
import { AppService } from './app.service';
import { AiAgentsModule } from './ai-agents/ai-agents.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    KeycloakModule,
    AuthModule,
    UserModule,
    MaterialModule,
    InventoryLotModule,
    ProductionBatchModule,
    InventoryTransactionModule,
    QCTestModule,
    // AiModule,
    LabelTemplateModule,
    WarehouseHierarchyModule,
    SystemMonitoringModule,
    LogModule,
    BarcodeModule,
    InventoryTransactionModule,
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
