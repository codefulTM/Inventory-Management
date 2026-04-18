import OrderForm from "../../components/operator/import-export-order/OrderForm";

export default function StockOutOperator() {
  return (
    <OrderForm
      orderType="Outbound"
      title="Phiếu Xuất Kho"
      description="Tạo phiếu xuất kho cho Operator. Dữ liệu sẽ được lưu ở trạng thái PendingConfirmation để chờ xác nhận theo luồng US24."
    />
  );
}
