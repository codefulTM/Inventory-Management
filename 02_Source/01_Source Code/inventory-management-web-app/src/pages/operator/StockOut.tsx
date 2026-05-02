/**
 * StockOut Page (Operator)
 * Trang tạo phiếu xuất kho dành cho Operator
 * 
 * Chức năng chính:
 * - Tạo phiếu xuất kho mới (Outbound Order)
 * - Sử dụng component OrderForm với orderType="Outbound"
 * - Phiếu được lưu ở trạng thái PendingConfirmation, chờ Operator xác nhận thực tế
 * - Theo luồng nghiệp vụ US24: Tạo phiếu → PendingConfirmation → Xác nhận xuất kho
 * 
 * Quy trình xuất kho:
 * 1. Operator điền thông tin phiếu xuất (vật tư, số lượng, nơi nhận...)
 * 2. Hệ thống lưu phiếu với trạng thái PendingConfirmation
 * 3. Operator kiểm tra thực tế hàng hóa tại kho và trừ tồn kho
 * 4. Xác nhận phiếu để hoàn tất xuất kho (inventory-lot giảm số lượng)
 */
import OrderForm from "../../components/operator/import-export-order/OrderForm";

/**
 * Component StockOut dành cho Operator
 * Wrapper đơn giản gọi OrderForm với cấu hình xuất kho
 * 
 * - orderType="Outbound": Xác định đây là phiếu xuất kho
 * - title: Tiêu đề hiển thị trên form
 * - description: Mô tả hướng dẫn cho Operator
 */
export default function StockOutOperator() {
  return (
    <OrderForm
      orderType="Outbound"
      title="Phiếu Xuất Kho"
      description="Tạo phiếu xuất kho cho Operator. Dữ liệu sẽ được lưu ở trạng thái PendingConfirmation để chờ xác nhận theo luồng US24."
    />
  );
}
