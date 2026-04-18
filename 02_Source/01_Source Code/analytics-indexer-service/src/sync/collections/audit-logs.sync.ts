import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCollectionSync } from './base-collection-sync';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import { ElasticsearchBulkService } from '../../elasticsearch/elasticsearch-bulk.service';
import { InventoryAuditReport } from '../../schemas/inventory-audit-report.schema';

/**
 * Syncs the `inventory_audit_reports` collection.
 * Collection name exposed to ES as `inventory_audit_reports`.
 */
@Injectable()
export class AuditLogsSync extends BaseCollectionSync {
  readonly collectionName = 'inventory_audit_reports';

  constructor(
    @InjectModel(InventoryAuditReport.name) readonly model: Model<InventoryAuditReport>,
    indexNaming: IndexNamingService,
    esBulk: ElasticsearchBulkService,
  ) {
    super(indexNaming, esBulk);
  }
}
