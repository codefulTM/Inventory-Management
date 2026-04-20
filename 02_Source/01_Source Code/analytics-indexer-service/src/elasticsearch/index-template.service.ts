import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.constants';
import { ConfigService } from '@nestjs/config';

type MappingProperties = Record<string, unknown>;

@Injectable()
export class IndexTemplateService {
  private readonly logger = new Logger(IndexTemplateService.name);
  private readonly vectorDims: number;

  constructor(
    @Inject(ELASTICSEARCH_CLIENT) private readonly client: Client,
    private readonly config: ConfigService,
  ) {
    this.vectorDims = this.config.get<number>('rag.embedding.vectorDims') ?? 384;
  }

  private getCollectionMappings(): Record<string, { properties: MappingProperties }> {
    const commonRagProps: MappingProperties = {
      source_type: { type: 'keyword' },
      source_id: { type: 'keyword' },
      source_collection: { type: 'keyword' },
      rag_text: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword', ignore_above: 512 },
        },
      },
      rag_metadata: { type: 'object', enabled: true },
      acl_tags: { type: 'keyword' },
      updated_at: { type: 'date' },
      embedding: {
        type: 'dense_vector',
        dims: this.vectorDims,
        index: true,
        similarity: 'cosine',
      },
    };

    return {
      inventory_lots: {
        properties: {
          lot_id: { type: 'keyword' },
          material_id: { type: 'keyword' },
          supplier_name: { type: 'keyword' },
          status: { type: 'keyword' },
          quantity: { type: 'double' },
          expiration_date: { type: 'date' },
          created_date: { type: 'date' },
          modified_date: { type: 'date' },
          ...commonRagProps,
        },
      },
      inventory_transactions: {
        properties: {
          transaction_id: { type: 'keyword' },
          lot_id: { type: 'keyword' },
          material_id: { type: 'keyword' },
          transaction_type: { type: 'keyword' },
          quantity: { type: 'double' },
          transaction_date: { type: 'date' },
          performed_by: { type: 'keyword' },
          created_date: { type: 'date' },
          modified_date: { type: 'date' },
          ...commonRagProps,
        },
      },
      qc_tests: {
        properties: {
          test_id: { type: 'keyword' },
          lot_id: { type: 'keyword' },
          material_id: { type: 'keyword' },
          supplier_name: { type: 'keyword' },
          result_status: { type: 'keyword' },
          test_date: { type: 'date' },
          created_date: { type: 'date' },
          modified_date: { type: 'date' },
          ...commonRagProps,
        },
      },
      materials: {
        properties: {
          material_id: { type: 'keyword' },
          part_number: { type: 'keyword' },
          material_name: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword', ignore_above: 256 },
            },
          },
          material_type: { type: 'keyword' },
          status: { type: 'keyword' },
          created_date: { type: 'date' },
          modified_date: { type: 'date' },
        },
      },
      inventory_audit_reports: {
        properties: {
          report_id: { type: 'keyword' },
          status: { type: 'keyword' },
          requested_by: { type: 'keyword' },
          action: { type: 'keyword' },
          entity: { type: 'keyword' },
          performed_by: { type: 'keyword' },
          performed_at: { type: 'date' },
          created_date: { type: 'date' },
          modified_date: { type: 'date' },
        },
      },
      import_export_orders: {
        properties: {
          order_id: { type: 'keyword' },
          order_type: { type: 'keyword' },
          status: { type: 'keyword' },
          warehouse_id: { type: 'keyword' },
          created_by: { type: 'keyword' },
          created_date: { type: 'date' },
          modified_date: { type: 'date' },
        },
      },
      docs_knowledge: {
        properties: {
          path: { type: 'keyword' },
          chunk_index: { type: 'integer' },
          section_title: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword', ignore_above: 256 },
            },
          },
          created_date: { type: 'date' },
          modified_date: { type: 'date' },
          ...commonRagProps,
        },
      },
    };
  }

  getManagedCollections(): string[] {
    return Object.keys(this.getCollectionMappings());
  }

  async applyTemplates(collections?: string[]): Promise<void> {
    const targetCollections =
      collections && collections.length > 0
        ? collections
        : this.getManagedCollections();

    const collectionMappings = this.getCollectionMappings();

    for (const collection of targetCollections) {
      const mapping = collectionMappings[collection];
      if (!mapping) {
        this.logger.warn(`No mapping template found for collection "${collection}"`);
        continue;
      }

      await this.client.indices.putIndexTemplate({
        name: `task4_${collection}_template`,
        index_patterns: [`${collection}_*`],
        template: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
          mappings: {
            dynamic: true,
            ...mapping,
          },
        },
      });

      this.logger.log(`Applied ES index template for ${collection}`);
    }
  }
}
