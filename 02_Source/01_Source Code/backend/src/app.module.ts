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
import { QCTestModule } from './qc-test/qc-test.module';
import { AiModule } from './ai/ai.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { LabelTemplateModule } from './label-template/label-template.module';
import { InventoryTransactionModule } from './inventory-transaction/inventory-transaction.module';
import { AppService } from "./app.service";
import { KafkaModule } from './event-bus/kafka.module';

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
    QCTestModule,
    // AiModule,
    LabelTemplateModule,
    InventoryTransactionModule,
    KafkaModule,
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


