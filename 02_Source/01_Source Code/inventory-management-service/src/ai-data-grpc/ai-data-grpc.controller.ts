import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { InventoryLotService } from '../inventory-lot/inventory-lot.service';
import { InventoryTransactionService } from '../inventory-transaction/inventory-transaction.service';
import { QCTestService } from '../qc-test/qc-test.service';
import {
  CreateInventoryLotDto,
  UpdateInventoryLotDto,
} from '../inventory-lot/inventory-lot.dto';

interface AiDataRequest {
  action: string;
  payload: string; // JSON-encoded
}

interface AiDataResponse {
  success: boolean;
  data: string; // JSON-encoded
  error: string;
}

interface RagSearchRequestPayload {
  query?: string;
  top_k?: number;
  source_collections?: string[];
  embedding?: number[];
}

@Controller()
export class AiDataGrpcController {
  private readonly logger = new Logger(AiDataGrpcController.name);

  constructor(
    private readonly inventoryLotService: InventoryLotService,
    private readonly inventoryTransactionService: InventoryTransactionService,
    private readonly qcTestService: QCTestService,
  ) {}

  @GrpcMethod('AiDataService', 'ExecuteAction')
  async executeAction(req: AiDataRequest): Promise<AiDataResponse> {
    try {
      const payload = req.payload
        ? (JSON.parse(req.payload) as Record<string, unknown>)
        : {};
      const result = await this.dispatch(req.action, payload);
      return { success: true, data: JSON.stringify(result), error: '' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `AiDataService.ExecuteAction[${req.action}] error: ${msg}`,
      );
      return { success: false, data: '', error: msg };
    }
  }

  private async dispatch(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    switch (action) {
      case 'getLotsStatistics':
        return this.inventoryLotService.getLotsStatistics();

      case 'getExpiringSoon': {
        const days = typeof payload.days === 'number' ? payload.days : 30;
        return this.inventoryLotService.getExpiringSoon(days);
      }

      case 'getExpiredLots':
        return this.inventoryLotService.getExpiredLots();

      case 'getTransactions': {
        const page = typeof payload.page === 'number' ? payload.page : 1;
        const limit = typeof payload.limit === 'number' ? payload.limit : 20;
        // Cast to unknown first to avoid strict-type issues on the private/union method
        const svc = this.inventoryTransactionService as unknown as {
          getAll: (
            filters: Record<string, unknown>,
            paging: { page: number; limit: number },
          ) => Promise<{ items: unknown[]; total: number }>;
        };
        return svc.getAll({}, { page, limit });
      }

      case 'getSupplierPerformance': {
        const filter: { from?: string; to?: string } = {};
        if (typeof payload.from === 'string') filter.from = payload.from;
        if (typeof payload.to === 'string') filter.to = payload.to;
        return this.qcTestService.getSupplierPerformance(filter);
      }

      case 'getDashboardKPI':
        return this.qcTestService.getDashboardKPI();

      case 'submitQCDecision': {
        const lotId = String(payload.lot_id ?? '');
        const decision = String(payload.decision ?? '') as
          | 'Accepted'
          | 'Rejected'
          | 'Hold';
        const verified_by = String(payload.verified_by ?? '');
        const reject_reason =
          typeof payload.reject_reason === 'string'
            ? payload.reject_reason
            : undefined;
        return this.qcTestService.submitDecision(lotId, {
          decision,
          verified_by,
          reject_reason,
        });
      }

      case 'createInventoryLot': {
        const dto = Object.assign(new CreateInventoryLotDto(), payload);
        return this.inventoryLotService.create(dto);
      }

      case 'findInventoryLotById': {
        const id = String(payload.id ?? '');
        return this.inventoryLotService.findById(id);
      }

      case 'updateInventoryLot': {
        const { id, ...rest } = payload as { id: string } & Record<
          string,
          unknown
        >;
        const dto = Object.assign(new UpdateInventoryLotDto(), rest);
        return this.inventoryLotService.update(String(id ?? ''), dto);
      }

      case 'semanticSearch': {
        return this.searchKnowledge(payload as RagSearchRequestPayload, false);
      }

      case 'hybridSearch': {
        return this.searchKnowledge(payload as RagSearchRequestPayload, true);
      }

      default:
        throw new Error(`Unknown AI data action: ${action}`);
    }
  }

  private async searchKnowledge(
    payload: RagSearchRequestPayload,
    useHybrid: boolean,
  ): Promise<Record<string, unknown>> {
    const query = String(payload.query ?? '').trim();
    const normalizedQuery = this.normalizeQuery(query);
    const isExpiryIntent = this.isExpiryIntent(normalizedQuery);
    const expiryWindowDays = this.extractDayWindow(normalizedQuery);
    const topK =
      typeof payload.top_k === 'number' && payload.top_k > 0
        ? Math.min(payload.top_k, 20)
        : 5;

    const sourceCollections = Array.isArray(payload.source_collections)
      ? payload.source_collections.filter((item) => typeof item === 'string')
      : [
          'inventory_lots',
          'inventory_transactions',
          'qc_tests',
          'docs_knowledge',
        ];

    const embedding = Array.isArray(payload.embedding)
      ? payload.embedding.filter((value) => typeof value === 'number')
      : [];

    const elasticsearchNode = process.env.ELASTICSEARCH_NODE || '';
    if (!elasticsearchNode) {
      this.logger.warn(
        'ELASTICSEARCH_NODE is not configured. semantic/hybrid search returns empty result.',
      );
      return {
        query,
        top_k: topK,
        total: 0,
        hits: [],
        search_mode: useHybrid ? 'hybrid' : 'semantic',
        disabled_reason: 'ELASTICSEARCH_NODE not configured',
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const username = process.env.ELASTICSEARCH_USERNAME || '';
    const password = process.env.ELASTICSEARCH_PASSWORD || '';
    if (username && password) {
      headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }

    const filters = sourceCollections.length
      ? [{ terms: { source_collection: sourceCollections } }]
      : [];

    if (isExpiryIntent) {
      const expiryFocusedCollections = sourceCollections.filter(
        (item) => item === 'inventory_lots',
      );
      if (expiryFocusedCollections.length > 0) {
        filters.push({
          terms: { source_collection: expiryFocusedCollections },
        });
      }
    }

    const queryVariants = Array.from(
      new Set([query, normalizedQuery].filter(Boolean)),
    );

    const shouldClauses: Record<string, unknown>[] = [];
    if (queryVariants.length > 0) {
      for (const variant of queryVariants) {
        shouldClauses.push({
          multi_match: {
            query: variant,
            fields: [
              'rag_text^4',
              'material_name^2',
              'section_title^2',
              'source_id^2',
              'status',
              'transaction_type',
              'result_status',
              'rag_metadata.lot_id^3',
              'rag_metadata.material_id^2',
              'rag_metadata.transaction_id^2',
              'rag_metadata.transaction_type',
              'rag_metadata.test_id^2',
              'rag_metadata.result_status',
              'rag_metadata.status',
            ],
            operator: 'or',
          },
        });
      }
    }

    if (isExpiryIntent) {
      shouldClauses.push(
        {
          match_phrase: {
            rag_text: {
              query: 'het han',
              boost: 3,
            },
          },
        },
        {
          match_phrase: {
            rag_text: {
              query: 'expiration date',
              boost: 2,
            },
          },
        },
        {
          range: {
            'rag_metadata.expiration_date': {
              gte: 'now/d',
              lte: `now+${expiryWindowDays}d/d`,
              boost: 4,
            },
          },
        },
        {
          range: {
            'rag_metadata.in_use_expiration_date': {
              gte: 'now/d',
              lte: `now+${expiryWindowDays}d/d`,
              boost: 3,
            },
          },
        },
        {
          match_all: {
            boost: 0.05,
          },
        },
      );
    }

    const queryClause = shouldClauses.length
      ? {
          bool: {
            should: shouldClauses,
            minimum_should_match: 1,
          },
        }
      : { match_all: {} };

    const sortClause = isExpiryIntent
      ? [
          {
            'rag_metadata.expiration_date': {
              order: 'asc',
              missing: '_last',
              unmapped_type: 'date',
            },
          },
          {
            'rag_metadata.in_use_expiration_date': {
              order: 'asc',
              missing: '_last',
              unmapped_type: 'date',
            },
          },
          { _score: 'desc' },
        ]
      : [{ _score: 'desc' }];

    const searchBody: Record<string, unknown> = {
      size: topK,
      query: {
        bool: {
          must: [queryClause],
          filter: filters,
        },
      },
      _source: [
        'source_type',
        'source_id',
        'source_collection',
        'rag_text',
        'rag_metadata',
        'acl_tags',
        'updated_at',
      ],
      sort: sortClause,
    };

    if (useHybrid && embedding.length > 0) {
      searchBody.knn = {
        field: 'embedding',
        query_vector: embedding,
        k: topK,
        num_candidates: Math.max(topK * 4, 20),
        ...(filters.length
          ? {
              filter: {
                bool: {
                  must: filters,
                },
              },
            }
          : {}),
      };
    }

    const indexPattern = sourceCollections.length
      ? sourceCollections.map((item) => `${item}_*`).join(',')
      : '*';

    const endpoint = `${elasticsearchNode.replace(/\/$/, '')}/${indexPattern}/_search`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Elasticsearch search failed (${response.status}): ${message.slice(0, 200)}`,
      );
    }

    const result = (await response.json()) as Record<string, any>;
    const hits = Array.isArray(result?.hits?.hits)
      ? result.hits.hits.map((item: Record<string, any>) => ({
          id: item._id,
          score: item._score ?? 0,
          source_collection: item._source?.source_collection ?? null,
          source_type: item._source?.source_type ?? null,
          source_id: item._source?.source_id ?? null,
          rag_text: item._source?.rag_text ?? '',
          rag_metadata: item._source?.rag_metadata ?? {},
          acl_tags: item._source?.acl_tags ?? [],
          updated_at: item._source?.updated_at ?? null,
        }))
      : [];

    const totalRaw = result?.hits?.total;
    const total =
      typeof totalRaw === 'number'
        ? totalRaw
        : typeof totalRaw?.value === 'number'
          ? totalRaw.value
          : hits.length;

    return {
      query,
      top_k: topK,
      total,
      hits,
      search_mode: useHybrid && embedding.length > 0 ? 'hybrid' : 'semantic',
      used_embedding: useHybrid && embedding.length > 0,
    };
  }

  private normalizeQuery(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private isExpiryIntent(normalizedQuery: string): boolean {
    if (!normalizedQuery) return false;

    const hints = [
      'sap het han',
      'het han',
      'han dung',
      'expiring',
      'expiry',
      'expired',
      'expiration',
    ];

    return hints.some((hint) => normalizedQuery.includes(hint));
  }

  private extractDayWindow(normalizedQuery: string): number {
    if (!normalizedQuery) return 30;

    const match = normalizedQuery.match(/(\d{1,3})\s*(ngay|day|days|d)\b/);
    if (!match) return 30;

    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) return 30;
    return Math.min(value, 365);
  }
}
