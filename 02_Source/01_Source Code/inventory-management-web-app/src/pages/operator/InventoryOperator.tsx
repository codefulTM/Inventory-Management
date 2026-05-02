/**
 * InventoryOperator Page
 * Trang quản lý tồn kho dành cho Operator
 * 
 * Chức năng chính:
 * - Hiển thị danh sách các lô hàng (Inventory Lot) trong kho
 * - Cho phép Operator xem thông tin chi tiết từng lô: số lượng, vị trí, trạng thái
 * - Tìm kiếm, lọc lô hàng theo nhiều tiêu chí
 * - Quản lý các lô hàng ở các trạng thái: Quarantine, Accepted, Rejected, Depleted
 * 
 * Component InventoryLot được tái sử dụng từ trang Manager
 * Operator có quyền xem và cập nhật thông tin tồn kho thực tế
 */
import InventoryLot from "../manager/inventory-lot/InventoryLot";

const Page = () => (
  <div className="p-6">
    <h1 className="text-2xl font-semibold mb-4">Quản Lý Tồn Kho</h1>
    <InventoryLot />
  </div>
);

export default Page;
