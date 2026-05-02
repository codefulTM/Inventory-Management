/**
 * File: sync/collections/materials.sync.ts
 * Mục đích: Đồng bộ collection materials vào Elasticsearch
 * 
 * Kế thừa từ BaseCollectionSync nên sử dụng lại toàn bộ logic đồng bộ
 * Không cần ghi đè (override) method sync() vì:
 * - Không cần enrich thêm trường (như material_id cho transactions)
 * - Cấu trúc đơn giản, khớp trực tiếp với ES mapping
 * 
 * Collection: materials - Danh mục vật tư
 * ES Index: materials_{YYYY}_{MM}
 */
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
    // Inject Mongoose Model để truy vấn MongoDB
    @InjectModel(Material.name) readonly model: Model<Material>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    // Gọi constructor của class cha
    super(indexNaming, esBulk);
  }
}
