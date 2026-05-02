/**
 * InventoryAuditReportModule - Module báo cáo kiểm kê tồn kho
 *
 * Chức năng:
 * - Tạo báo cáo kiểm kê định kỳ cho kho (periodic stocktake reports)
 * - Theo dõi trạng thái báo cáo: PENDING → PROCESSING → READY / FAILED
 * - Render báo cáo ra định dạng PDF với chữ ký số
 * - Lưu trữ báo cáo (file storage)
 * - Ký điện tử (signature) cho báo cáo
 *
 * Components:
 * - InventoryAuditReportService: Xử lý nghiệp vụ
 * - InventoryAuditReportRenderer: Render báo cáo PDF
 * - SignatureService: Ký điện tử báo cáo
 * - InventoryAuditReportStorageService: Lưu trữ file báo cáo
 *
 * Schema đăng ký:
 * - InventoryAuditReport: Bản ghi báo cáo
 * - InventoryLot, Material, Warehouse: Dữ liệu tham chiếu
 */
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
