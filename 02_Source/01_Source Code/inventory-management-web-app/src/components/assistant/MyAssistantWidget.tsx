// === MY_ASSISTANT_WIDGET ===
// Widget AI Assistant hỗ trợ người dùng truy vấn thông tin kho bằng ngôn ngữ tự nhiên
// Props/Input: userRole từ localStorage, query text từ người dùng
// Features chính:
//   - Nhận diện 4 intent: expiring (hết hạn), expired (đã hết hạn), transactions (giao dịch), inventory (tồn kho)
//   - Hiển thị kết quả dạng bảng: lots, transactions, RAG context
//   - Gợi ý câu hỏi nhanh (quick suggestions)
//   - Chat interface với tin nhắn AI/người dùng
//   - Fallback logging khi không nhận diện được intent
//   - Ánh xạ vai trò người dùng: Manager, Operator, QC, IT Admin
// API calls: routeAgent() từ aiAgent.service