import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCollectionSync } from './base-collection-sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { ImportExportOrder } from '../../schemas/import-export-order.schema';

@Injectable()
export class ImportExportOrdersSync extends BaseCollectionSync {
  readonly collectionName = 'import_export_orders';

  constructor(
    @InjectModel(ImportExportOrder.name) readonly model: Model<ImportExportOrder>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    super(indexNaming, esBulk);
  }
}
