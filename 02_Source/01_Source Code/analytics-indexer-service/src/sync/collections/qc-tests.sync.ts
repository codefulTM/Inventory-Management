import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCollectionSync } from './base-collection-sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { QCTest } from '../../schemas/qc-test.schema';

@Injectable()
export class QCTestsSync extends BaseCollectionSync {
  readonly collectionName = 'qc_tests';

  constructor(
    @InjectModel(QCTest.name) readonly model: Model<QCTest>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    super(indexNaming, esBulk);
  }
}
