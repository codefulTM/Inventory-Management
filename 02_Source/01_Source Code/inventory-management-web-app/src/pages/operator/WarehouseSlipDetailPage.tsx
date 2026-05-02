/**
 * WarehouseSlipDetailPage (Operator)
 * Trang xem chi tiết phiếu nhập/xuất kho
 * 
 * Chức năng chính:
 * - Hiển thị thông tin chi tiết của một phiếu kho (Warehouse Slip)
 * - Thông tin bao gồm: mã phiếu, loại phiếu, ngày tạo, trạng thái
 * - Danh sách vật tư trong phiếu: tên, số lượng, đơn vị tính
 * - Cho phép in phiếu, xác nhận hoặc từ chối phiếu (tùy trạng thái)
 * 
 * Nếu không có ID hợp lệ sẽ hiển thị trang 404 (NotFoundPage)
 */
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import WarehouseSlipDetail from "../../components/operator/warehouse-slip/WarehouseSlipDetail";
import NotFoundPage from "../NotFoundPage";

export default function WarehouseSlipDetailPage() {
  const { id } = useParams();

  if (!id) return <NotFoundPage />;
  return <WarehouseSlipDetail id={id} />;
}
