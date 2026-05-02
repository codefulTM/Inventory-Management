// Service gọi dữ liệu từ backend (inventory-management-service) qua gRPC
// Cung cấp các phương thức thao tác với InventoryLot, Transaction, QC Test và RAG Search
// Backend expose một gRPC service tên "AiDataService" với method "executeAction"
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom, Observable } from "rxjs";

// Interface định nghĩa gRPC service từ backend
// Backend expose method executeAction để thực hiện các hành động khác nhau
interface AiDataGrpcService {
  executeAction(req: { action: string; payload: string }): Observable<{
    success: boolean;
    data: string; // JSON string chứa dữ liệu kết quả
    error: string; // Thông báo lỗi nếu có
  }>;
}

// Interface mô tả một kết quả tìm kiếm RAG (Retrieval-Augmented Generation)
export interface RagSearchHit {
  id: string; // ID của document
  score: number; // Điểm tương đồng (similarity score)
  source_collection: string | null; // Tên collection nguồn (inventory_lots, qc_tests, ...)
  source_type: string | null; // Loại nguồn dữ liệu
  source_id: string | null; // ID của bản ghi gốc
  rag_text: string; // Nội dung văn bản được retrieve
  rag_metadata: Record<string, unknown>; // Metadata bổ sung
  acl_tags: string[]; // Tags phân quyền (Access Control List)
  updated_at: string | null; // Thời điểm cập nhật
}

// Interface phản hồi từ RAG search
export interface RagSearchResponse {
  query: string; // Query gốc
  top_k: number; // Số lượng kết quả yêu cầu
  total: number; // Tổng số kết quả tìm thấy
  hits: RagSearchHit[]; // Danh sách các kết quả (top-k)
  search_mode: "semantic" | "hybrid"; // Chế độ tìm kiếm
  used_embedding?: boolean; // Có sử dụng embedding vector không
  disabled_reason?: string; // Lý do tìm kiếm bị disable (nếu có)
}

@Injectable()
export class BackendDataService implements OnModuleInit {
  private readonly logger = new Logger(BackendDataService.name);
  private aiDataService: AiDataGrpcService; // gRPC service client

  // Inject gRPC client với token 'BACKEND_AI_DATA'
  constructor(@Inject("BACKEND_AI_DATA") private readonly client: ClientGrpc) {}

  // Khởi tạo service khi module được load
  onModuleInit() {
    // Lấy instance của AiDataService từ gRPC client
    this.aiDataService =
      this.client.getService<AiDataGrpcService>("AiDataService");
  }

  // Phương thức private thực thi một action thông qua gRPC
  // action: Tên hành động (getLotsStatistics, createInventoryLot, ...)
  // payload: Dữ liệu đi kèm (sẽ được JSON.stringify)
  private async execute<T>(
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<T> {
    // Gọi gRPC method executeAction và chuyển đổi Observable sang Promise
    const result = await firstValueFrom(
      this.aiDataService.executeAction({
        action,
        payload: JSON.stringify(payload), // Backend yêu cầu payload dạng JSON string
      }),
    );
    // Nếu backend trả về success=false thì throw error
    if (!result.success) {
      throw new Error(
        result.error || `AiDataService action '${action}' failed`,
      );
    }
    // Parse JSON string thành object T
    return JSON.parse(result.data) as T;
  }

  // ─── InventoryLot ─────────────────────────────────────────────────────────

  // Lấy thống kê tổng quan về các lô hàng trong kho
  // Bao gồm: tổng số, theo trạng thái, sắp hết hạn, đã hết hạn
  async getLotsStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    expiringSoon: number;
    expired: number;
  }> {
    return this.execute("getLotsStatistics");
  }

  // Lấy danh sách các lô hàng sắp hết hạn trong số ngày quy định
  async getExpiringSoon(days = 30): Promise<unknown[]> {
    return this.execute("getExpiringSoon", { days });
  }

  // Lấy danh sách các lô hàng đã hết hạn
  async getExpiredLots(): Promise<unknown[]> {
    return this.execute("getExpiredLots");
  }

  // Tạo mới một lô hàng (Inventory Lot)
  async createInventoryLot(dto: Record<string, unknown>): Promise<unknown> {
    return this.execute("createInventoryLot", dto);
  }

  // Tìm một lô hàng theo ID
  async findInventoryLotById(id: string): Promise<unknown> {
    return this.execute("findInventoryLotById", { id });
  }

  // Cập nhật thông tin lô hàng theo ID
  async updateInventoryLot(
    id: string,
    dto: Record<string, unknown>,
  ): Promise<unknown> {
    return this.execute("updateInventoryLot", { id, ...dto });
  }

  // ─── InventoryTransaction ─────────────────────────────────────────────────

  // Lấy danh sách giao dịch kho (có phân trang)
  async getTransactions(
    page = 1,
    limit = 20,
  ): Promise<{ items: unknown[]; total: number }> {
    return this.execute("getTransactions", { page, limit });
  }

  // ─── QC Test ──────────────────────────────────────────────────────────────

  // Lấy hiệu suất nhà cung cấp dựa trên dữ liệu QC test
  // Có thể lọc theo khoảng thời gian (from/to)
  async getSupplierPerformance(filter?: {
    from?: string;
    to?: string;
  }): Promise<unknown[]> {
    return this.execute("getSupplierPerformance", filter ?? {});
  }

  // Lấy các chỉ số KPI của dashboard QC
  async getDashboardKPI(): Promise<{
    pending_count: number; // Số lô chờ duyệt QC
    approved_count: number; // Số lô đạt QC
    rejected_count: number; // Số lô bị từ chối
    error_rate: number; // Tỷ lệ lỗi (%)
  }> {
    return this.execute("getDashboardKPI");
  }

  // Submit quyết định QC cho một lô hàng
  // decision: Accepted | Rejected | Hold
  async submitQCDecision(
    lotId: string,
    dto: { decision: string; verified_by: string; reject_reason?: string },
  ): Promise<unknown> {
    return this.execute("submitQCDecision", { lot_id: lotId, ...dto });
  }

  // ─── RAG Retrieval ────────────────────────────────────────────────────────

  // Tìm kiếm ngữ nghĩa (semantic search) trong dữ liệu nghiệp vụ
  // Sử dụng embedding vector để tìm tài liệu liên quan
  async semanticSearch(
    query: string,
    topK = 5,
    sourceCollections?: string[],
  ): Promise<RagSearchResponse> {
    return this.execute("semanticSearch", {
      query,
      top_k: topK,
      source_collections: sourceCollections,
    });
  }

  // Tìm kiếm kết hợp (hybrid): Kết hợp giữa keyword và semantic search
  // Cần truyền thêm vector embedding của query
  async hybridSearch(
    query: string,
    embedding: number[],
    topK = 5,
    sourceCollections?: string[],
  ): Promise<RagSearchResponse> {
    return this.execute("hybridSearch", {
      query,
      top_k: topK,
      source_collections: sourceCollections,
      embedding,
    });
  }
}
