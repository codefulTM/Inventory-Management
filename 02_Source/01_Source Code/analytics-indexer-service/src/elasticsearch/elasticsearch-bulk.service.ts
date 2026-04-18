import { Injectable, Inject, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.constants';

export interface BulkResult {
  indexed: number;
  deleted: number;
  errors: number;
}

@Injectable()
export class ElasticsearchBulkService {
  private readonly logger = new Logger(ElasticsearchBulkService.name);

  constructor(@Inject(ELASTICSEARCH_CLIENT) private readonly client: Client) {}

  /**
   * Bulk-indexes documents into the given index.
   * Each doc must contain an `_id`-compatible identifier (uses `_id` field or Mongo `_id`).
   */
  async bulkIndex(index: string, docs: Record<string, any>[]): Promise<BulkResult> {
    if (!docs.length) return { indexed: 0, deleted: 0, errors: 0 };

    const operations = docs.flatMap((doc) => {
      const { _id, __v, ...body } = doc;
      const id = (_id ?? doc.id)?.toString();
      return [{ index: { _index: index, _id: id } }, body];
    });

    const response = await this.client.bulk({ refresh: false, operations });

    let indexed = 0;
    let errors = 0;
    for (const item of response.items) {
      const op = item.index;
      if (op?.error) {
        errors++;
        this.logger.warn(`Bulk index error for _id=${op._id}: ${JSON.stringify(op.error)}`);
      } else {
        indexed++;
      }
    }

    return { indexed, deleted: 0, errors };
  }

  /**
   * Bulk-deletes documents from the given index by their IDs.
   */
  async bulkDelete(index: string, ids: string[]): Promise<BulkResult> {
    if (!ids.length) return { indexed: 0, deleted: 0, errors: 0 };

    const operations = ids.flatMap((id) => [{ delete: { _index: index, _id: id } }]);

    const response = await this.client.bulk({ refresh: false, operations });

    let deleted = 0;
    let errors = 0;
    for (const item of response.items) {
      const op = item.delete;
      if (op?.error) {
        errors++;
        this.logger.warn(`Bulk delete error for _id=${op._id}: ${JSON.stringify(op.error)}`);
      } else {
        deleted++;
      }
    }

    return { indexed: 0, deleted, errors };
  }
}
