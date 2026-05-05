// === InboundControl.tsx ===
// Page QC kiểm định lô hàng đầu vào
// Methods/Features: Hiển thị danh sách lô theo trạng thái (Quarantine/Accepted/Rejected/Hold), tìm kiếm, mở modal kiểm định, nhập kết quả (độ ẩm, tinh khiết, cảm quan), tự động đánh giá Pass/Fail, gửi quyết định Accept/Reject/Hold
// API/Dependencies: getInventoryLots, createQCTest, submitLotDecision, InventoryLot, CreateQCTestDto, LotDecisionDto types