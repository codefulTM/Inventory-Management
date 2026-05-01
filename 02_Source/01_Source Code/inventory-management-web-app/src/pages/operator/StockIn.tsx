import OrderForm from "../../components/operator/import-export-order/OrderForm";

export default function StockInOperator() {
  return (
    <OrderForm
      orderType="Inbound"
      title="Phiếu Nhập Kho"
      description="Tạo phiếu nhập kho cho Operator. Dữ liệu sẽ được lưu ở trạng thái PendingConfirmation để chờ xác nhận theo luồng US24."
    />
  );
}
