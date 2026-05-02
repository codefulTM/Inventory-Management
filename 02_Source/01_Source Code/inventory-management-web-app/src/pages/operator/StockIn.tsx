/**
 * StockIn Page (Operator)
 * Trang tạo phiếu nhập kho dành cho Operator
 * 
 * Chức năng chính:
 * - Tạo phiếu nhập kho mới (Inbound Order)
 * - Sử dụng component OrderForm với orderType="Inbound"
 * - Phiếu được lưu ở trạng thái PendingConfirmation, chờ Operator xác nhận thực tế
 * - Theo luồng nghiệp vụ US24: Tạo phiếu → PendingConfirmation → Xác nhận nhập kho
 * 
 * Quy trình nhập kho:
 * 1. Operator điền thông tin phiếu nhập (vật tư, số lượng, nhà cung cấp...)
 * 2. Hệ thống lưu phiếu với trạng thái PendingConfirmation
 * 3. Operator kiểm tra thực tế hàng hóa tại kho
 * 4. Xác nhận phiếu để cập nhật tồn kho (inventory-lot được tạo)
 */
import OrderForm from "../../components/operator/import-export-order/OrderForm";

/**
 * Component StockIn dành cho Operator
 * Wrapper đơn giản gọi OrderForm với cấu hình nhập kho
 * 
 * - orderType="Inbound": Xác định đây là phiếu nhập kho
 * - title: Tiêu đề hiển thị trên form
 * - description: Mô tả hướng dẫn cho Operator
 */
export default function StockInOperator() {
  return (
    <OrderForm
      orderType="Inbound"
      title="Phiếu Nhập Kho"
      description="Tạo phiếu nhập kho cho Operator. Dữ liệu sẽ được lưu ở trạng thái PendingConfirmation để chờ xác nhận theo luồng US24."
    />
  );
}
