/**
 * File: elasticsearch/elasticsearch-bulk.service.ts
 * Mục đích: Thực hiện các thao tác bulk (hàng loạt) với Elasticsearch
 * 
 * Dịch vụ này cung cấp:
 * - bulkIndex: Đưa (index) nhiều tài liệu vào ES cùng lúc
 * - bulkDelete: Xóa nhiều tài liệu khỏi ES cùng lúc
 * 
 * Tự động làm giàu (enrich) dữ liệu bằng RAG nếu có RagDocumentEnricherService
 * Chỉ mục (index) được phân vùng theo tháng: {collection}_{YYYY}_{MM}
 */
import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.constants';
import { RagDocumentEnricherService } from '../rag/rag-document-enricher.service';

// Kết quả của một thao tác bulk
export interface BulkResult {
  indexed: number;  // Số tài liệu đã index thành công
  deleted: number;  // Số tài liệu đã xóa thành công
  errors: number;   // Số lỗi xảy ra
}

// Tùy chọn khi thực hiện bulk index
export interface ElasticsearchBulkIndexOptions {
  collectionName?: string;  // Tên collection (để làm giàu RAG)
  alreadyEnriched?: boolean; // Đánh dấu tài liệu đã được làm giàu chưa
}

@Injectable()
export class ElasticsearchBulkService {
  private readonly logger = new Logger(ElasticsearchBulkService.name);

  constructor(
    @Inject(ELASTICSEARCH_CLIENT) private readonly client: Client,
    // RagDocumentEnricherService là tùy chọn (Optional) - có thể không có
    @Optional() private readonly ragEnricher?: RagDocumentEnricherService,
  ) {}

  /**
   * Đưa (index) hàng loạt tài liệu vào Elasticsearch
   * @param index - Tên chỉ mục ES (ví dụ: inventory_lots_2026_04)
   * @param docs - Mảng các tài liệu cần index
   * @param options - Tùy chọn bổ sung
   * @returns Kết quả thao tác (indexed, deleted, errors)
   * 
   * Mỗi tài liệu phải có trường _id (sử dụng _id của MongoDB hoặc id)
   * Nếu chưa được làm giàu và có RAG enricher -> tự động làm giàu trước khi index
   */
  async bulkIndex(
    index: string,
    docs: Record<string, any>[],
    options: ElasticsearchBulkIndexOptions = {},
  ): Promise<BulkResult> {
    if (!docs.length) return { indexed: 0, deleted: 0, errors: 0 };

    // Xác định tên collection từ tên index (để dùng cho RAG enrichment)
    const collectionName =
      options.collectionName ?? this.inferCollectionName(index);
    
    // Làm giàu tài liệu bằng RAG nếu cần
    const targetDocs =
      options.alreadyEnriched === true || !collectionName || !this.ragEnricher
        ? docs
        : await this.ragEnricher.enrichMongoDocuments(collectionName, docs);

    // Tạo các thao tác bulk: mỗi doc có 2 dòng (action + body)
    const operations = targetDocs.flatMap((doc) => {
      // Loại bỏ các trường nội bộ của Mongoose (_id, __v)
      const { _id, __v, ...body } = doc;
      const id = (_id ?? doc.id)?.toString();
      return [{ index: { _index: index, _id: id } }, body];
    });

    // Thực hiện bulk API của ES (refresh: false để tăng hiệu suất)
    const response = await this.client.bulk({ refresh: false, operations });

    // Đếm số lượng thành công và lỗi
    let indexed = 0;
    let errors = 0;
    for (const item of response.items) {
      const op = item.index;
      if (op?.error) {
        errors++;
        this.logger.warn(`Lỗi bulk index cho _id=${op._id}: ${JSON.stringify(op.error)}`);
      } else {
        indexed++;
      }
    }

    return { indexed, deleted: 0, errors };
  }

  /**
   * Xóa hàng loạt tài liệu khỏi Elasticsearch dựa trên ID
   * @param index - Tên chỉ mục ES
   * @param ids - Mảng các ID cần xóa
   * @returns Kết quả thao tác
   * 
   * Thường dùng để xóa các bản ghi đã bị soft-delete ở MongoDB
   */
  async bulkDelete(index: string, ids: string[]): Promise<BulkResult> {
    if (!ids.length) return { indexed: 0, deleted: 0, errors: 0 };

    // Tạo các thao tác xóa cho từng ID
    const operations = ids.flatMap((id) => [{ delete: { _index: index, _id: id } }]);

    const response = await this.client.bulk({ refresh: false, operations });

    let deleted = 0;
    let errors = 0;
    for (const item of response.items) {
      const op = item.delete;
      if (op?.error) {
        errors++;
        this.logger.warn(`Lỗi bulk delete cho _id=${op._id}: ${JSON.stringify(op.error)}`);
      } else {
        deleted++;
      }
    }

    return { indexed: 0, deleted, errors };
  }

  /**
   * Suy luận tên collection từ tên index
   * @param index - Tên index (ví dụ: inventory_lots_2026_04)
   * @returns Tên collection (ví dụ: inventory_lots) hoặc null
   */
  private inferCollectionName(index: string): string | null {
    const match = index.match(/^(.*)_\d{4}_\d{2}$/);
    return match ? match[1] : null;
  }
}
