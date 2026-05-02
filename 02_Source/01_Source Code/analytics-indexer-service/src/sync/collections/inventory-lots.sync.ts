/**
 * File: sync/collections/inventory-lots.sync.ts
 * Mục đích: Đồng bộ collection inventory_lots vào Elasticsearch
 * 
 * Kế thừa từ BaseCollectionSync nên sử dụng lại toàn bộ logic đồng bộ
 * Không cần ghi đè sync() vì:
 * - Không cần enrich thêm trường (đã có đủ thông tin cần thiết)
 * - Cấu trúc khớp trực tiếp với ES mapping
 * 
 * Collection: inventory_lots - Lô hàng tồn kho
 * ES Index: inventory_lots_{YYYY}_{MM}
 */
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
    // Inject Mongoose Model để truy vấn MongoDB
    @InjectModel(InventoryLot.name) readonly model: Model<InventoryLot>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    // Gọi constructor của class cha
    super(indexNaming, esBulk);
  }
}
