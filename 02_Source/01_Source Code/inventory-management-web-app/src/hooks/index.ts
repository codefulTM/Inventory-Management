/**
 * Hooks Index - Điểm xuất phát tập trung cho tất cả Custom Hooks
 * 
 * Mục đích: Giúp import hooks một cách gọn gàng:
 * import { useMaterialList, useAuth } from '../hooks';
 * Thay vì phải import từng file: import { useMaterialList } from '../hooks/useMaterialList';
 */
export { useMaterialList } from "./useMaterialList";
export { useMaterialSearch } from "./useMaterialSearch";
export { useMaterialForm } from "./useMaterialForm";
export { useMaterialDetail } from "./useMaterialDetail";
export { useWarehouseList } from "./useWarehouseList";
export { useAuth, usePermission, useIsManager, useIsOperator, useIsQCTechnician, useIsITAdmin } from "./useAuth";
