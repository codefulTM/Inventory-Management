/**
 * Materials List Page (Operator)
 * Trang danh sách vật tư dành cho Operator
 * 
 * Chức năng chính:
 * - Hiển thị danh sách tất cả vật tư trong hệ thống
 * - Xem thông tin cơ bản: mã vật tư, tên, loại, đơn vị tính
 * - Tìm kiếm và lọc vật tư theo các tiêu chí
 * - Operator có thể xem nhưng không chỉnh sửa thông tin vật tư (chỉ Manager mới có quyền)
 * 
 * Component MaterialList được tái sử dụng, tự động phân quyền theo role
 */
import React from "react";
import { MaterialList } from "../../../components/material/components/MaterialList";

const Page: React.FC = () => {
  return (
    <div>
      <h1>Danh Sách Vật Tư (Operator)</h1>
      <MaterialList />
    </div>
  );
};

export default Page;
