/**
 * WarehouseSlipCreate Page (Operator)
 * Trang tạo phiếu nhập/xuất kho trực tiếp cho Operator
 * 
 * Chức năng chính:
 * - Tạo phiếu nhập kho (Inbound): Nhập vật tư mới vào kho
 * - Tạo phiếu xuất kho (Outbound): Xuất vật tư từ kho
 * - Điền thông tin: loại phiếu, vật tư, số lượng, nhà cung cấp/khách hàng
 * - Lưu phiếu và chờ xác nhận thực tế tại kho
 * 
 * Khác với StockIn/StockOut:
 * - WarehouseSlip là phiếu đơn giản hơn, thường dùng cho các giao dịch nhanh
 * - Không qua quy trình PendingConfirmation phức tạp như ImportExportOrder
 * - Phù hợp cho các giao dịch nhập/xuất trực tiếp tại kho
 */
import React from "react";
import WarehouseSlipForm from "../../components/operator/warehouse-slip/WarehouseSlipForm";

export default function WarehouseSlipCreate() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Tạo Phiếu Nhập/Xuất Kho</h1>
      <WarehouseSlipForm />
    </div>
  );
}
