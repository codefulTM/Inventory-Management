/**
 * InventoryTransactionListOperator Page
 * Trang xem lịch sử giao dịch kho cá nhân của Operator
 * 
 * Chức năng chính:
 * - Hiển thị danh sách các giao dịch kho (inventory transactions) do Operator thực hiện
 * - Chỉ hiển thị giao dịch của Operator đang đăng nhập (mode="my-history")
 * - Các loại giao dịch: Nhập (Receipt), Xuất (Usage), Kiểm kê (Adjustment)
 * - Xem chi tiết: thời gian, số lượng, vật tư, lô hàng liên quan
 * 
 * Component InventoryTransactionList được cấu hình ở chế độ hiển thị lịch sử cá nhân
 */
import React from "react";
import InventoryTransactionList from "../../components/inventory-transaction/InventoryTransactionList";

const InventoryTransactionListOperator: React.FC = () => {
  return (
    <InventoryTransactionList
      title="Lịch Sử Giao Dịch Cá Nhân"
      mode="my-history"
    />
  );
};

export default InventoryTransactionListOperator;
