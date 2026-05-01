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
