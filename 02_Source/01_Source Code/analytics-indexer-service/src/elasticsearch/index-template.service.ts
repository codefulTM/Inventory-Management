/**
 * File: elasticsearch/index-template.service.ts
 * Mục đích: Quản lý Elasticsearch Index Templates cho các collection
 * 
 * Index Template giúp:
 * - Định nghĩa cấu trúc (mapping) cho các index trước khi chúng được tạo
 * - Áp dụng tự động cho các index khớp với pattern (ví dụ: inventory_lots_*)
 * - Đảm bảo kiểu dữ liệu đúng (keyword thay vì text cho aggregation)
 * 
 * Service này quản lý templates cho 7 collections:
 * 1. inventory_lots - Lô hàng tồn kho
 * 2. inventory_transactions - Giao dịch kho
 * 3. qc_tests - Kết quả kiểm tra chất lượng
 * 4. materials - Vật tư
 * 5. inventory_audit_reports - Báo cáo kiểm kê
 * 6. import_export_orders - Đơn nhập/xuất kho
 * 7. docs_knowledge - Tài liệu kiến thức (Markdown)
 * 
 * Mỗi collection có thêm các trường RAG (Retrieval-Augmented Generation):
 * - source_type, source_id, source_collection
 * - rag_text, rag_metadata, acl_tags
 * - embedding (vector để tìm kiếm ngữ nghĩa)
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.constants';
import { ConfigService } from '@nestjs/config';

// Kiểu dữ liệu cho mapping properties của Elasticsearch
type MappingProperties = Record<string, unknown>;

@Injectable()
export class IndexTemplateService {
  private readonly logger = new Logger(IndexTemplateService.name);
  // Số chiều của vector embedding (mặc định: 384 - all-MiniLM-L6-v2)
  private readonly vectorDims: number;

  constructor(
    @Inject(ELASTICSEARCH_CLIENT) private readonly client: Client,
    private readonly config: ConfigService,
  ) {
    this.vectorDims = this.config.get<number>('rag.embedding.vectorDims') ?? 384;
  }

  /**
   * Định nghĩa mapping cho tất cả các collection được quản lý
   * @returns Object chứa mapping của từng collection
   * 
   * Mỗi collection có cấu trúc riêng + commonRagProps (cho tính năng RAG)
   * commonRagProps bao gồm các trường để hỗ trợ tìm kiếm ngữ nghĩa
   */
  private getCollectionMappings(): Record<string, { properties: MappingProperties }> {
    // Các trường RAG chung cho tất cả collections có hỗ trợ RAG
    const commonRagProps: MappingProperties = {
      source_type: { type: 'keyword' },       // Loại nguồn: mongo hoặc markdown
      source_id: { type: 'keyword' },          // ID của tài liệu nguồn
      source_collection: { type: 'keyword' }, // Tên collection
      rag_text: {
        type: 'text',                         // Nội dung để tìm kiếm full-text
        fields: {
          keyword: { type: 'keyword', ignore_above: 512 },
        },
      },
      rag_metadata: { type: 'object', enabled: true }, // Metadata bổ sung
      acl_tags: { type: 'keyword' },          // Tags phân quyền truy cập
      updated_at: { type: 'date' },           // Thời gian cập nhật
      embedding: {
        type: 'dense_vector',                 // Vector embedding cho tìm kiếm ngữ nghĩa
        dims: this.vectorDims,                // Số chiều (384, 768, ...)
        index: true,                          // Đánh chỉ mục cho tìm kiếm vector
        similarity: 'cosine',                // Độ đo tương đồng cosine
      },
    };

    return {
      // 1. Inventory Lots - Lô hàng tồn kho
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
      
      // 2. Inventory Transactions - Giao dịch kho (IN/OUT)
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
      
      // 3. QC Tests - Kết quả kiểm tra chất lượng
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
      
      // 4. Materials - Danh mục vật tư
      materials: {
        properties: {
          material_id: { type: 'keyword' },
          part_number: { type: 'keyword' },
          material_name: {
            type: 'text',                         // Có thể tìm kiếm full-text
            fields: {
              keyword: { type: 'keyword', ignore_above: 256 },
            },
          },
          material_type: { type: 'keyword' },
          status: { type: 'keyword' },
          created_date: { type: 'date' },
          modified_date: { type: 'date' },
          // Không có commonRagProps vì materials chưa cần RAG
        },
      },
      
      // 5. Inventory Audit Reports - Báo cáo kiểm kê (từ audit_logs)
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
      
      // 6. Import/Export Orders - Đơn nhập/xuất kho
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
      
      // 7. Documents Knowledge - Tài liệu kiến thức từ Markdown
      docs_knowledge: {
        properties: {
          path: { type: 'keyword' },           // Đường dẫn file
          chunk_index: { type: 'integer' },     // Chỉ số chunk
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

  /**
   * Lấy danh sách tất cả các collection được quản lý
   * @returns Mảng tên các collection
   */
  getManagedCollections(): string[] {
    return Object.keys(this.getCollectionMappings());
  }

  /**
   * Áp dụng (apply) index templates cho Elasticsearch
   * @param collections - Danh sách collection cụ thể (tùy chọn)
   * 
   * Tạo index template với:
   * - index_patterns: Khớp với tất cả index của collection (ví dụ: inventory_lots_*)
   * - settings: 1 shard, 0 replica (cho môi trường dev/test)
   * - mappings: Cấu trúc trường đã định nghĩa
   * 
   * Template giúp ES tự động áp dụng mapping khi tạo index mới
   */
  async applyTemplates(collections?: string[]): Promise<void> {
    // Nếu không chỉ định collections -> áp dụng cho tất cả
    const targetCollections =
      collections && collections.length > 0
        ? collections
        : this.getManagedCollections();

    const collectionMappings = this.getCollectionMappings();

    for (const collection of targetCollections) {
      const mapping = collectionMappings[collection];
      if (!mapping) {
        this.logger.warn(`Không tìm thấy template mapping cho collection "${collection}"`);
        continue;
      }

      // Tạo hoặc cập nhật index template trong ES
      await this.client.indices.putIndexTemplate({
        name: `task4_${collection}_template`,
        index_patterns: [`${collection}_*`],  // Khớp với tất cả index phân vùng theo tháng
        template: {
          settings: {
            number_of_shards: 1,      // 1 shard cho mỗi index
            number_of_replicas: 0,     // 0 replica (dev/test)
          },
          mappings: {
            dynamic: true,             // Cho phép thêm trường động
            ...mapping,
          },
        },
      });

      this.logger.log(`Đã áp dụng ES index template cho ${collection}`);
    }
  }

  /**
   * Xóa các index cũ có mapping sai (text thay vì keyword)
   * @param collections - Danh sách collection cụ thể (tùy chọn)
   * 
   * Elasticsearch auto-mapping có thể gán sai kiểu cho các trường keyword thành text
   * Điều này làm hỏng các truy vấn aggregation
   * Hàm này phát hiện và xóa các index có mapping sai để tái tạo với template đúng
   * 
   * Cần gọi sau applyTemplates() để các index mới nhận được mapping đúng
   */
  async purgeStaleIndices(collections?: string[]): Promise<void> {
    const targetCollections =
      collections && collections.length > 0
        ? collections
        : this.getManagedCollections();

    for (const collection of targetCollections) {
      const expectedMapping = this.getCollectionMappings()[collection];
      if (!expectedMapping) continue;

      // Tìm các trường đáng lẽ phải là keyword nhưng có thể bị auto-map thành text
      const expectedKeywordFields = Object.entries(
        (expectedMapping as any).properties as Record<string, { type: string }>,
      )
        .filter(([, v]) => v.type === 'keyword')
        .map(([k]) => k);

      if (expectedKeywordFields.length === 0) continue;

      // Lấy danh sách các index hiện có của collection này
      let indices: string[];
      try {
        const response = await this.client.cat.indices({
          index: `${collection}_*`,
          format: 'json',
          h: 'index',
        });
        indices = (response as any[]).map((r: any) => r.index as string);
      } catch {
        // Chưa có index nào -> không cần purge
        continue;
      }

      // Kiểm tra từng index
      for (const indexName of indices) {
        let mappingResp: any;
        try {
          mappingResp = await this.client.indices.getMapping({ index: indexName });
        } catch {
          continue;
        }

        const props: Record<string, any> =
          mappingResp?.[indexName]?.mappings?.properties ?? {};

        // Tìm các trường đang là text nhưng lẽ ra phải là keyword
        const staleFields = expectedKeywordFields.filter(
          (field) => props[field]?.type === 'text',
        );

        if (staleFields.length > 0) {
          this.logger.warn(
            `[purgeStaleIndices] Index "${indexName}" có mapping text sai cho các trường: ${staleFields.join(', ')} — đang xóa để tái tạo index với template đúng`,
          );
          // Xóa index -> lần sync sau sẽ tạo lại với mapping đúng từ template
          await this.client.indices.delete({ index: indexName });
          this.logger.log(`[purgeStaleIndices] Đã xóa index cũ: ${indexName}`);
        }
      }
    }
  }
}
