import React from "react";
import InventoryTransactionList from "../../components/inventory-transaction/InventoryTransactionList";

const InventoryTransactionListOperator: React.FC = () => {
  return (
    <InventoryTransactionList
      title="Lịch sử giao dịch cá nhân"
      mode="my-history"
    />
  );
};

export default InventoryTransactionListOperator;
