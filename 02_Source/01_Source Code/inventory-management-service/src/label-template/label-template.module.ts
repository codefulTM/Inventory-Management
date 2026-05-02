/**
 * LabelTemplateModule - Module quản lý mẫu nhãn (label template)
 *
 * Chức năng:
 * - Quản lý các mẫu nhãn barcode/QR code tùy chỉnh
 * - Cho phép tạo, chỉnh sửa, xóa mẫu nhãn
 * - Liên kết mẫu nhãn với lô hàng hoặc lô sản xuất
 * - Hỗ trợ in nhãn cho vật tư, lô hàng, thành phẩm
 *
 * Phụ thuộc:
 * - InventoryLotModule: Gắn nhãn cho lô hàng
 * - ProductionBatchModule: Gắn nhãn cho lô sản xuất
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LabelTemplate,
  LabelTemplateSchema,
} from '../schemas/label-template.schema';
import { LabelTemplateController } from './label-template.controller';
import { LabelTemplateService } from './label-template.service';
import { LabelTemplateRepository } from './label-template.repository';
import { InventoryLotModule } from '../inventory-lot/inventory-lot.module';
import { ProductionBatchModule } from '../production-batch/production-batch.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LabelTemplate.name, schema: LabelTemplateSchema },
    ]),
    InventoryLotModule,
    ProductionBatchModule,
  ],
  controllers: [LabelTemplateController],
  providers: [LabelTemplateRepository, LabelTemplateService],
  exports: [LabelTemplateService],
})
export class LabelTemplateModule {}
