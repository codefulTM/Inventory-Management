import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCollectionSync } from './base-collection-sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { Material } from '../../schemas/material.schema';

@Injectable()
export class MaterialsSync extends BaseCollectionSync {
  readonly collectionName = 'materials';

  constructor(
    @InjectModel(Material.name) readonly model: Model<Material>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    super(indexNaming, esBulk);
  }
}
