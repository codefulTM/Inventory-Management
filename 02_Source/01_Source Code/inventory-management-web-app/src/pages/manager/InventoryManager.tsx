/**
 * InventoryManager - Trang quản lý tồn kho chính dành cho Manager
 * Đây là container page, hiển thị component InventoryLot
 * Chức năng chính: Quản lý các lô hàng (Inventory Lots)
 * Bao gồm: xem danh sách, tìm kiếm, thêm mới, chỉnh sửa lô hàng
 */
import InventoryLot from "./inventory-lot/InventoryLot";

const Page = () => (
  <div className="p-6">
    <h1 className="text-2xl font-semibold mb-4">Quản lý tồn kho (Manager)</h1>
    <InventoryLot />
  </div>
);

export default Page;
