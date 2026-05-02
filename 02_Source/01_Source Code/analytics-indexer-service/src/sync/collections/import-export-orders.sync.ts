/**
 * File: sync/collections/import-export-orders.sync.ts
 * Mục đích: Đồng bộ collection import_export_orders vào Elasticsearch
 * 
 * Kế thừa từ BaseCollectionSync nên sử dụng lại toàn bộ logic đồng bộ
 * Không cần ghi đè (override) method sync() vì:
 * - Cấu trúc đơn giản, khớp trực tiếp với ES mapping
 * - Không cần enrich thêm trường
 * 
 * Collection: import_export_orders - Đơn nhập/xuất kho
 * ES Index: import_export_orders_{YYYY}_{MM}
 */
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
    // Inject Mongoose Model để truy vấn MongoDB
    @InjectModel(ImportExportOrder.name) readonly model: Model<ImportExportOrder>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    // Gọi constructor của class cha
    super(indexNaming, esBulk);
  }
}
