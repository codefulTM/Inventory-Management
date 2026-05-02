/**
 * Ý định của AI Agent (phân loại câu hỏi)
 * inventory_analyst: Trả lời về phân tích tồn kho
 * warehouse_operator: Hỗ trợ thao tác kho (nhập/xuất)
 * qc_compliance_checker: Kiểm tra tuân thủ QC
 * unknown: Không xác định được ý định
 */
export type AgentIntent =
  | "inventory_analyst"
  | "warehouse_operator"
  | "qc_compliance_checker"
  | "unknown";

/**
 * Một dòng thông tin lô hàng dùng cho AI Assistant
 * Hiển thị trong kết quả trả về của agent
 */
export interface AssistantLotRow {
  lot_id: string;           // Mã lô hàng
  material_id: string;       // Mã vật tư
  expiration_date: string;  // Ngày hết hạn
  quantity: number;         // Số lượng
  unit_of_measure: string;  // Đơn vị tính
  status: string;           // Trạng thái lô
}

/**
 * Trích dẫn nguồn dữ liệu (RAG Citation)
 * Khi AI sử dụng dữ liệu từ vector database
 */
export interface RetrievalCitation {
  citation_id: string;        // ID trích dẫn
  source_collection: string;   // Tên collection (materials, lots...)
  source_id: string;          // ID bản ghi nguồn
  source_type?: string;       // Loại nguồn
  score?: number;             // Điểm liên quan (0-1)
  updated_at?: string;       // Ngày cập nhật nguồn
  preview?: string;          // Xem trước nội dung
}

/**
 * Đoạn văn bản được làm nổi bật từ RAG
 * Hiển thị phần thông tin có liên quan nhất
 */
export interface RetrievalHighlight {
  source_collection: string;   // Collection nguồn
  source_id: string;          // ID bản ghi
  score?: number;             // Điểm liên quan
  rag_text_preview?: string;  // Đoạn văn bản liên quan
}

/**
 * Dữ liệu truy xuất từ RAG (Retrieval-Augmented Generation)
 * Chứa thông tin về cách AI tìm kiếm dữ liệu
 */
export interface RetrievalData {
  total: number;                           // Tổng số kết quả tìm được
  mode: "semantic" | "hybrid" | string;    // Chế độ tìm kiếm
  used_embedding: boolean;                  // Có dùng vector embedding không
  disabled_reason?: string;                // Lý do không dùng embedding
  highlights?: RetrievalHighlight[];       // Các đoạn làm nổi bật
  citations?: RetrievalCitation[];          // Các trích dẫn nguồn
}

/**
 * Thông tin phân trang cho kết quả từ Agent
 */
export interface AgentPagination {
  page: number;       // Trang hiện tại
  limit: number;      // Số items/trang
  total: number;      // Tổng số items
  totalPages: number; // Tổng số trang
}

/**
 * Tóm tắt các lô hàng cho Agent
 * Dùng để đưa ra cái nhìn tổng quan nhanh
 */
export interface AgentLotsSummary {
  total?: number;                  // Tổng số lô
  byStatus?: Record<string, number>; // Phân loại theo trạng thái
  expiringSoon?: number;            // Số lô sắp hết hạn
  expired?: number;                // Số lô đã hết hạn
}

/**
 * Dữ liệu kết quả từ AI Agent
 * Chứa thông tin phong phú từ nhiều nguồn khác nhau
 */
export interface AgentResultData {
  query?: string;                          // Câu hỏi gốc
  query_window_days?: number;               // Cửa sổ thời gian truy vấn
  insights?: string[];                      // Các nhận định của AI
  lots?: AgentLotsSummary;                 // Tóm tắt lô hàng
  pagination?: AgentPagination;             // Phân trang
  retrieval?: RetrievalData;               // Dữ liệu RAG
  retrieval_citations?: RetrievalCitation[]; // Trích dẫn
  expiringLots?: AssistantLotRow[];        // Lô sắp hết hạn
  expiredLots?: AssistantLotRow[];         // Lô đã hết hạn
  [key: string]: unknown;                  // Cho phép thêm field linh hoạt
}

/**
 * Kết quả định tuyến và xử lý từ AI Agent
 * Kết quả trả về từ API POST /ai-agents/route
 */
export interface AgentRouteResult {
  intent: AgentIntent;                      // Ý định đã nhận diện
  confidence: number;                        // Độ tin cậy (0-1)
  reason: string;                           // Lý do phân loại
  result: {
    status: "ok" | "needs_input" | "error"; // Trạng thái xử lý
    message: string;                         // Thông báo cho người dùng
    assistant_reply?: string;               // Câu trả lời từ AI
    agent_profile?: {                        // Thông tin agent đã dùng
      name: string;
      description: string;
      instructions: string[];
      model: string;
      tools: string[];
    };
    data?: AgentResultData;                  // Dữ liệu kết quả
  };
  timestamp: string;                        // Thời điểm xử lý
}

/**
 * Dữ liệu gửi đi khi yêu cầu AI Agent xử lý
 * Gửi lên API POST /ai-agents/route
 */
export interface RouteAgentRequest {
  query: string;                                // Câu hỏi/truy vấn
  action?: string;                               // Hành động cụ thể (tùy chọn)
  payload?: Record<string, unknown>;            // Dữ liệu bổ sung
}
