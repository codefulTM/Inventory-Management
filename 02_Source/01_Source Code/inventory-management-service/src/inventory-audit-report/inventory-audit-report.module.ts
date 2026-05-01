import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InventoryAuditReport,
  InventoryAuditReportSchema,
} from '../schemas/inventory-audit-report.schema';
import {
  InventoryLot,
  InventoryLotSchema,
} from '../schemas/inventory-lot.schema';
import { Material, MaterialSchema } from '../schemas/material.schema';
import { Warehouse, WarehouseSchema } from '../schemas/warehouse.schema';
import { InventoryAuditReportController } from './inventory-audit-report.controller';
import { InventoryAuditReportService } from './inventory-audit-report.service';
import { InventoryAuditReportRepository } from './inventory-audit-report.repository';
import { InventoryAuditReportRenderer } from './pdf/inventory-audit-report.renderer';
import { SignatureService } from './signature/signature.service';
import { InventoryAuditReportStorageService } from './storage/inventory-audit-report-storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryAuditReport.name, schema: InventoryAuditReportSchema },
      { name: InventoryLot.name, schema: InventoryLotSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
    ]),
  ],
  controllers: [InventoryAuditReportController],
  providers: [
    InventoryAuditReportService,
    InventoryAuditReportRepository,
    InventoryAuditReportRenderer,
    SignatureService,
    InventoryAuditReportStorageService,
  ],
})
export class InventoryAuditReportModule {}
