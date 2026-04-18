import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCollectionSync } from './base-collection-sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { InventoryTransaction } from '../../schemas/inventory-transaction.schema';

@Injectable()
export class InventoryTransactionsSync extends BaseCollectionSync {
  readonly collectionName = 'inventory_transactions';

  constructor(
    @InjectModel(InventoryTransaction.name) readonly model: Model<InventoryTransaction>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    super(indexNaming, esBulk);
  }
}
