// Import các decorator và class cần thiết từ NestJS
import { Controller, Logger } from '@nestjs/common';
// Import decorator để định nghĩa phương thức gRPC
import { GrpcMethod } from '@nestjs/microservices';
// Import các service để xử lý nghiệp vụ liên quan đến lô hàng, giao dịch và kiểm tra chất lượng
import { InventoryLotService } from '../inventory-lot/inventory-lot.service';
import { InventoryTransactionService } from '../inventory-transaction/inventory-transaction.service';
import { QCTestService } from '../qc-test/qc-test.service';
// Import các DTO để tạo và cập nhật lô hàng
import {
  CreateInventoryLotDto,
  UpdateInventoryLotDto,
} from '../inventory-lot/inventory-lot.dto';

/**
 * Interface định nghĩa cấu trúc yêu cầu từ AI Service qua gRPC
 * @property action - Tên hành động cần thực hiện (ví dụ: getLotsStatistics, createInventoryLot...)
 * @property payload - Dữ liệu đi kèm được mã hóa dưới dạng JSON string
 */
interface AiDataRequest {
  action: string;
  payload: string; // JSON-encoded
}

/**
 * Interface định nghĩa cấu trúc phản hồi về cho AI Service qua gRPC
 * @property success - Trạng thái thành công hay thất bại
 * @property data - Dữ liệu kết quả được mã hóa dưới dạng JSON string
 * @property error - Thông báo lỗi (nếu có)
 */
interface AiDataResponse {
  success: boolean;
  data: string; // JSON-encoded
  error: string;
}

/**
 * Interface định nghĩa cấu trúc payload cho yêu cầu tìm kiếm RAG (Retrieval-Augmented Generation)
 * @property query - Câu truy vấn tìm kiếm
 * @property top_k - Số lượng kết quả trả về tối đa
 * @property source_collections - Danh sách các collection nguồn để tìm kiếm
 * @property embedding - Vector embedding của câu truy vấn (dùng cho tìm kiếm semantic/hybrid)
 */
interface RagSearchRequestPayload {
  query?: string;
  top_k?: number;
  source_collections?: string[];
  embedding?: number[];
}

/**
 * Controller xử lý các yêu cầu dữ liệu từ AI Service thông qua gRPC
 * Đóng vai trò là cầu nối giữa AI Service và các dịch vụ nội bộ của hệ thống quản lý kho
 */
@Controller()
export class AiDataGrpcController {
  // Logger để ghi lại các thông tin log, lỗi trong quá trình xử lý
  private readonly logger = new Logger(AiDataGrpcController.name);

  /**
   * Constructor: Tiêm (inject) các service cần thiết để sử dụng trong controller
   * @param inventoryLotService - Service quản lý lô hàng tồn kho
   * @param inventoryTransactionService - Service quản lý giao dịch kho
   * @param qcTestService - Service quản lý kiểm tra chất lượng
   */
  constructor(
    private readonly inventoryLotService: InventoryLotService,
    private readonly inventoryTransactionService: InventoryTransactionService,
    private readonly qcTestService: QCTestService,
  ) {}

  /**
   * Phương thức gRPC chính để thực thi các hành động từ AI Service
   * Được ánh xạ tới service 'AiDataService' và method 'ExecuteAction'
   * @param req - Yêu cầu từ AI Service chứa action và payload
   * @returns Kết quả thực thi dưới dạng AiDataResponse
   */
  @GrpcMethod('AiDataService', 'ExecuteAction')
  async executeAction(req: AiDataRequest): Promise<AiDataResponse> {
    try {
      // Giải mã payload từ JSON string sang object
      const payload = req.payload
        ? (JSON.parse(req.payload) as Record<string, unknown>)
        : {};
      // Phân phối yêu cầu đến các hàm xử lý tương ứng dựa trên action
      const result = await this.dispatch(req.action, payload);
      // Trả về kết quả thành công
      return { success: true, data: JSON.stringify(result), error: '' };
    } catch (err: unknown) {
      // Xử lý lỗi: lấy thông báo lỗi và ghi log
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `AiDataService.ExecuteAction[${req.action}] error: ${msg}`,
      );
      // Trả về kết quả thất bại kèm thông báo lỗi
      return { success: false, data: '', error: msg };
    }
  }

  /**
   * Phân phối các hành động đến các phương thức xử lý tương ứng
   * Đây là bộ định tuyến (router) các action từ AI Service
   * @param action - Tên hành động cần thực hiện
   * @param payload - Dữ liệu đi kèm với hành động
   * @returns Kết quả từ service tương ứng
   */
  private async dispatch(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    switch (action) {
      // Lấy thống kê về các lô hàng (tổng số, hết hạn, sắp hết hạn...)
      case 'getLotsStatistics':
        return this.inventoryLotService.getLotsStatistics();

      // Lấy danh sách các lô hàng sắp hết hạn
      case 'getExpiringSoon': {
        // Lấy số ngày từ payload, mặc định là 30 ngày nếu không được cung cấp
        const days = typeof payload.days === 'number' ? payload.days : 30;
        return this.inventoryLotService.getExpiringSoon(days);
      }

      // Lấy danh sách các lô hàng đã hết hạn
      case 'getExpiredLots':
        return this.inventoryLotService.getExpiredLots();

      // Lấy danh sách các giao dịch kho (có phân trang)
      case 'getTransactions': {
        // Lấy thông tin phân trang từ payload, mặc định page=1, limit=20
        const page = typeof payload.page === 'number' ? payload.page : 1;
        const limit = typeof payload.limit === 'number' ? payload.limit : 20;
        // Cast sang kiểu có phương thức getAll để tránh lỗi kiểu dữ liệu nghiêm ngặt
        const svc = this.inventoryTransactionService as unknown as {
          getAll: (
            filters: Record<string, unknown>,
            paging: { page: number; limit: number },
          ) => Promise<{ items: unknown[]; total: number }>;
        };
        return svc.getAll({}, { page, limit });
      }

      // Lấy hiệu suất của nhà cung cấp dựa trên kết quả QC
      case 'getSupplierPerformance': {
        const filter: { from?: string; to?: string } = {};
        if (typeof payload.from === 'string') filter.from = payload.from;
        if (typeof payload.to === 'string') filter.to = payload.to;
        return this.qcTestService.getSupplierPerformance(filter);
      }

      // Lấy các chỉ số KPI cho dashboard (tỷ lệ đạt, số lô đã kiểm tra...)
      case 'getDashboardKPI':
        return this.qcTestService.getDashboardKPI();

      // Gửi quyết định kiểm tra chất lượng cho một lô hàng (Chấp nhận/Từ chối/Hold)
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

      // Tạo mới một lô hàng tồn kho
      case 'createInventoryLot': {
        // Chuyển đổi payload thành DTO để validate dữ liệu
        const dto = Object.assign(new CreateInventoryLotDto(), payload);
        return this.inventoryLotService.create(dto);
      }

      // Tìm lô hàng theo ID
      case 'findInventoryLotById': {
        const id = String(payload.id ?? '');
        return this.inventoryLotService.findById(id);
      }

      // Cập nhật thông tin lô hàng
      case 'updateInventoryLot': {
        // Tách id ra khỏi payload vì id không nằm trong DTO cập nhật
        const { id, ...rest } = payload as { id: string } & Record<
          string,
          unknown
        >;
        const dto = Object.assign(new UpdateInventoryLotDto(), rest);
        return this.inventoryLotService.update(String(id ?? ''), dto);
      }

      // Tìm kiếm ngữ nghĩa (semantic search) sử dụng Elasticsearch + embedding
      case 'semanticSearch': {
        return this.searchKnowledge(payload as RagSearchRequestPayload, false);
      }

      // Tìm kiếm kết hợp (hybrid search): kết hợp giữa từ khóa và vector embedding
      case 'hybridSearch': {
        return this.searchKnowledge(payload as RagSearchRequestPayload, true);
      }

      // Ném lỗi nếu action không được hỗ trợ
      default:
        throw new Error(`Unknown AI data action: ${action}`);
    }
  }

  /**
   * Thực hiện tìm kiếm kiến thức trong Elasticsearch
   * Hỗ trợ cả tìm kiếm semantic (dựa trên embedding) và hybrid (kết hợp từ khóa + embedding)
   * @param payload - Thông tin tìm kiếm (query, embedding, collections...)
   * @param useHybrid - True nếu sử dụng hybrid search, False nếu chỉ dùng semantic search
   * @returns Kết quả tìm kiếm bao gồm các hits và metadata
   */
  private async searchKnowledge(
    payload: RagSearchRequestPayload,
    useHybrid: boolean,
  ): Promise<Record<string, unknown>> {
    // Lấy và chuẩn hóa câu truy vấn
    const query = String(payload.query ?? '').trim();
    const normalizedQuery = this.normalizeQuery(query);
    
    // Kiểm tra ý định tìm kiếm liên quan đến hết hạn
    const isExpiryIntent = this.isExpiryIntent(normalizedQuery);
    // Trích xuất số ngày từ câu truy vấn (ví dụ: "30 ngày")
    const expiryWindowDays = this.extractDayWindow(normalizedQuery);
    
    // Xác định số lượng kết quả trả về (tối đa 20)
    const topK =
      typeof payload.top_k === 'number' && payload.top_k > 0
        ? Math.min(payload.top_k, 20)
        : 5;

    // Lấy danh sách các collection nguồn để tìm kiếm
    const sourceCollections = Array.isArray(payload.source_collections)
      ? payload.source_collections.filter((item) => typeof item === 'string')
      : [
          'inventory_lots',
          'inventory_transactions',
          'qc_tests',
          'docs_knowledge',
        ];

    // Lấy vector embedding từ payload (nếu có)
    const embedding = Array.isArray(payload.embedding)
      ? payload.embedding.filter((value) => typeof value === 'number')
      : [];

    // Kiểm tra cấu hình Elasticsearch
    const elasticsearchNode = process.env.ELASTICSEARCH_NODE || '';
    if (!elasticsearchNode) {
      // Ghi log cảnh báo nếu chưa cấu hình Elasticsearch
      this.logger.warn(
        'ELASTICSEARCH_NODE is not configured. semantic/hybrid search returns empty result.',
      );
      // Trả về kết quả rỗng với lý do bị vô hiệu hóa
      return {
        query,
        top_k: topK,
        total: 0,
        hits: [],
        search_mode: useHybrid ? 'hybrid' : 'semantic',
        disabled_reason: 'ELASTICSEARCH_NODE not configured',
      };
    }

    // Thiết lập headers cho yêu cầu HTTP đến Elasticsearch
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Thêm Basic Authentication nếu có cấu hình username/password
    const username = process.env.ELASTICSEARCH_USERNAME || '';
    const password = process.env.ELASTICSEARCH_PASSWORD || '';
    if (username && password) {
      headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }

    // Tạo các bộ lọc (filters) dựa trên source collections
    const filters = sourceCollections.length
      ? [{ terms: { source_collection: sourceCollections } }]
      : [];

    // Nếu là tìm kiếm liên quan đến hết hạn, chỉ tập trung vào collection inventory_lots
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

    // Tạo các biến thể của câu truy vấn để tăng độ chính xác tìm kiếm
    const queryVariants = Array.from(
      new Set([query, normalizedQuery].filter(Boolean)),
    );

    // Xây dựng các điều kiện tìm kiếm (should clauses) cho Elasticsearch
    const shouldClauses: Record<string, unknown>[] = [];
    if (queryVariants.length > 0) {
      for (const variant of queryVariants) {
        // Tìm kiếm đa trường (multi_match) với các trọng số (boost) khác nhau
        shouldClauses.push({
          multi_match: {
            query: variant,
            fields: [
              'rag_text^4',              // Nội dung chính (trọng số cao nhất)
              'material_name^2',         // Tên vật liệu
              'section_title^2',         // Tiêu đề phần
              'source_id^2',             // ID nguồn
              'status',                  // Trạng thái
              'transaction_type',        // Loại giao dịch
              'result_status',           // Trạng thái kết quả QC
              'rag_metadata.lot_id^3',   // ID lô hàng (trọng số cao)
              'rag_metadata.material_id^2', // ID vật liệu
              'rag_metadata.transaction_id^2', // ID giao dịch
              'rag_metadata.transaction_type',
              'rag_metadata.test_id^2',  // ID bài test
              'rag_metadata.result_status',
              'rag_metadata.status',
            ],
            operator: 'or', // Match bất kỳ trường nào
          },
        });
      }
    }

    // Thêm các điều kiện đặc biệt nếu là tìm kiếm liên quan đến hết hạn
    if (isExpiryIntent) {
      shouldClauses.push(
        // Tìm cụm từ "het han" (trọng số 3)
        {
          match_phrase: {
            rag_text: {
              query: 'het han',
              boost: 3,
            },
          },
        },
        // Tìm cụm từ "expiration date" (trọng số 2)
        {
          match_phrase: {
            rag_text: {
              query: 'expiration date',
              boost: 2,
            },
          },
        },
        // Lọc theo khoảng thời gian hết hạn (expiration_date)
        {
          range: {
            'rag_metadata.expiration_date': {
              gte: 'now/d',                    // Từ hôm nay
              lte: `now+${expiryWindowDays}d/d`, // Đến sau X ngày
              boost: 4,                        // Trọng số cao nhất
            },
          },
        },
        // Lọc theo khoảng thời gian hết hạn sử dụng (in_use_expiration_date)
        {
          range: {
            'rag_metadata.in_use_expiration_date': {
              gte: 'now/d',
              lte: `now+${expiryWindowDays}d/d`,
              boost: 3,
            },
          },
        },
        // Luôn match tất cả (để đảm bảo có kết quả, trọng số thấp)
        {
          match_all: {
            boost: 0.05,
          },
        },
      );
    }

    // Xây dựng mệnh đề truy vấn chính (query clause)
    const queryClause = shouldClauses.length
      ? {
          bool: {
            should: shouldClauses,
            minimum_should_match: 1, // Phải match ít nhất 1 điều kiện
          },
        }
      : { match_all: {} };

    // Thiết lập sắp xếp kết quả
    const sortClause = isExpiryIntent
      ? [
          // Nếu tìm hết hạn: sắp xếp theo ngày hết hạn tăng dần (gần nhất trước)
          {
            'rag_metadata.expiration_date': {
              order: 'asc',
              missing: '_last',         // Thiếu dữ liệu xếp cuối
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
          { _score: 'desc' },          // Sau đó theo điểm số giảm dần
        ]
      : [{ _score: 'desc' }];          // Mặc định: sắp xếp theo điểm số giảm dần

    // Xây dựng body cho Elasticsearch search request
    const searchBody: Record<string, unknown> = {
      size: topK, // Số lượng kết quả trả về
      query: {
        bool: {
          must: [queryClause],  // Điều kiện bắt buộc
          filter: filters,     // Các bộ lọc
        },
      },
      // Chỉ lấy các trường cần thiết để tối ưu hiệu suất
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

    // Nếu dùng hybrid search và có embedding: thêm KNN search
    if (useHybrid && embedding.length > 0) {
      searchBody.knn = {
        field: 'embedding',           // Trường chứa vector embedding
        query_vector: embedding,      // Vector truy vấn
        k: topK,                      // Số lượng kết quả gần nhất
        num_candidates: Math.max(topK * 4, 20), // Số lượng candidate để xét
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

    // Tạo pattern cho index Elasticsearch dựa trên source collections
    const indexPattern = sourceCollections.length
      ? sourceCollections.map((item) => `${item}_*`).join(',')
      : '*';

    // Tạo endpoint URL cho Elasticsearch search API
    const endpoint = `${elasticsearchNode.replace(/\/$/, '')}/${indexPattern}/_search`;
    
    // Gửi yêu cầu POST đến Elasticsearch
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(searchBody),
    });

    // Kiểm tra nếu yêu cầu thất bại
    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Elasticsearch search failed (${response.status}): ${message.slice(0, 200)}`,
      );
    }

    // Parse kết quả JSON từ Elasticsearch
    const result = (await response.json()) as Record<string, any>;
    
    // Trích xuất và chuẩn hóa các hits (kết quả tìm kiếm)
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

    // Lấy tổng số kết quả (hỗ trợ cả 2 định dạng của Elasticsearch)
    const totalRaw = result?.hits?.total;
    const total =
      typeof totalRaw === 'number'
        ? totalRaw
        : typeof totalRaw?.value === 'number'
          ? totalRaw.value
          : hits.length;

    // Trả về kết quả tìm kiếm
    return {
      query,
      top_k: topK,
      total,
      hits,
      search_mode: useHybrid && embedding.length > 0 ? 'hybrid' : 'semantic',
      used_embedding: useHybrid && embedding.length > 0,
    };
  }

  /**
   * Chuẩn hóa câu truy vấn: chuyển về chữ thường, bỏ dấu tiếng Việt
   * @param value - Câu truy vấn gốc
   * @returns Câu truy vấn đã chuẩn hóa
   */
  private normalizeQuery(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')                              // Tách ký tự và dấu
      .replace(/[\u0300-\u036f]/g, '')               // Xóa các dấu tiếng Việt
      .trim();
  }

  /**
   * Kiểm tra xem câu truy vấn có phải là ý định tìm kiếm liên quan đến hết hạn không
   * @param normalizedQuery - Câu truy vấn đã chuẩn hóa
   * @returns True nếu là tìm kiếm hết hạn, False nếu không phải
   */
  private isExpiryIntent(normalizedQuery: string): boolean {
    if (!normalizedQuery) return false;

    // Các từ khóa gợi ý ý định tìm kiếm hết hạn (tiếng Việt và tiếng Anh)
    const hints = [
      'sap het han',    // sắp hết hạn
      'het han',        // hết hạn
      'han dung',       // hạn dùng
      'expiring',       // đang hết hạn (EN)
      'expiry',         // hết hạn (EN)
      'expired',        // đã hết hạn (EN)
      'expiration',     // ngày hết hạn (EN)
    ];

    // Kiểm tra xem câu truy vấn có chứa bất kỳ từ khóa nào không
    return hints.some((hint) => normalizedQuery.includes(hint));
  }

  /**
   * Trích xuất số ngày từ câu truy vấn (ví dụ: "trong 30 ngày", "30 days")
   * Hỗ trợ cả tiếng Việt và tiếng Anh
   * @param normalizedQuery - Câu truy vấn đã chuẩn hóa
   * @returns Số ngày (mặc định 30, tối đa 365)
   */
  private extractDayWindow(normalizedQuery: string): number {
    if (!normalizedQuery) return 30;

    // Regex tìm số theo sau bởi từ chỉ ngày (ngay/day/days/d)
    const match = normalizedQuery.match(/(\d{1,3})\s*(ngay|day|days|d)\b/);
    if (!match) return 30;

    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) return 30;
    // Giới hạn tối đa 365 ngày
    return Math.min(value, 365);
  }
}
