import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCollectionSync } from './base-collection-sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { InventoryLot } from '../../schemas/inventory-lot.schema';

@Injectable()
export class InventoryLotsSync extends BaseCollectionSync {
  readonly collectionName = 'inventory_lots';

  constructor(
    @InjectModel(InventoryLot.name) readonly model: Model<InventoryLot>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    super(indexNaming, esBulk);
  }
}
