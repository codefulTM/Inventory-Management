/**
 * MaterialManagementManager - Trang quản lý vật tư dành cho Manager
 * Chức năng: Hiển thị danh sách vật tư, quản lý thông tin nguyên liệu
 * Bao gồm: API, Excipient, Dietary Supplement, Container, Closure, Process Chemical
 * Manager có thể thêm mới, chỉnh sửa, xóa và phê duyệt vật tư
 */
import React from "react";
import MaterialList from "./materials/List";

const MaterialManagementManager: React.FC = () => {
  return <MaterialList />;
};

export default MaterialManagementManager;
