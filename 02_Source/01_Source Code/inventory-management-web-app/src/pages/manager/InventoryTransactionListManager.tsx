/**
 * InventoryTransactionListManager - Trang xem lịch sử giao dịch tồn kho dành cho Manager
 * Chức năng: Hiển thị toàn bộ lịch sử giao dịch nhập/xuất kho
 * Manager có thể theo dõi lịch sử để kiểm tra, đối soát và báo cáo
 */
import React from "react";
import InventoryTransactionList from "../../components/inventory-transaction/InventoryTransactionList";

const InventoryTransactionListManager: React.FC = () => {
  return <InventoryTransactionList title="Lịch sử giao dịch (Manager)" />;
};

export default InventoryTransactionListManager;
