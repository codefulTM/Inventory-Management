// Định nghĩa các kiểu dữ liệu (types) cho hệ thống AI Agents

// Enum các intent (ý định) của người dùng
// Supervisor sẽ phân loại yêu cầu vào một trong các intent này
export enum AgentIntent {
  INVENTORY_ANALYST = 'inventory_analyst', // Phân tích tồn kho, hạn dùng
  WAREHOUSE_OPERATOR = 'warehouse_operator', // Thao tác kho: tạo lô, barcode, gán kho
  QC_COMPLIANCE_CHECKER = 'qc_compliance_checker', // Kiểm tra QC và tuân thủ
  UNKNOWN = 'unknown', // Không xác định được ý định
}

// Kết quả điều hướng từ Supervisor Agent
export interface AgentRouteResult<T = unknown> {
  intent: AgentIntent; // Intent đã phân loại
  confidence: number; // Độ tin cậy (0.0 - 1.0)
  reason: string; // Lý do phân loại
  result: T; // Kết quả từ agent chuyên biệt
  timestamp: string; // Thời điểm xử lý (ISO format)
}

// Đầu vào cho một Agent Handler
export interface AgentHandlerInput {
  query: string; // Câu hỏi/truy vấn từ người dùng
  action?: string; // Hành động cụ thể (create_lot, submit_decision, ...)
  payload?: Record<string, unknown>; // Dữ liệu đi kèm (JSON object)
}

// Hồ sơ của một Agent (sử dụng để gửi cho LLM)
export interface AgentProfile {
  name: string; // Tên agent
  description: string; // Mô tả nhiệm vụ
  instructions: string[]; // Danh sách hướng dẫn cho LLM
  model: string; // Tên model LLM sử dụng
  tools: string[]; // Danh sách công cụ agent có thể dùng
}

// Kết quả trả về từ một Agent Handler
export interface AgentHandlerOutput {
  status: 'ok' | 'needs_input' | 'error'; // Trạng thái xử lý
  message: string; // Thông báo
  data?: Record<string, unknown>; // Dữ liệu kết quả
  assistant_reply?: string; // Phản hồi tự nhiên từ LLM (tiếng Việt)
  agent_profile?: AgentProfile; // Hồ sơ agent đã xử lý
}
