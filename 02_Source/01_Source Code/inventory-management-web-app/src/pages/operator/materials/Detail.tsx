/**
 * Material Detail Page (Operator)
 * Trang xem chi tiết vật tư dành cho Operator
 * 
 * Chức năng chính:
 * - Hiển thị thông tin chi tiết của một vật tư: mã, tên, loại, mô tả
 * - Thông số kỹ thuật, đơn vị tính, thời hạn sử dụng
 * - Lịch sử nhập/xuất kho của vật tư này
 * - Các lô hàng (lots) liên quan đến vật tư
 * 
 * Operator sử dụng trang này để:
 * - Tra cứu thông tin vật tư trước khi nhập/xuất kho
 * - Kiểm tra hạn sử dụng và quy cách đóng gói
 */
import React from "react";
import { useParams } from "react-router-dom";
import { fetchMaterial } from "../../../services/materialService";
import { MaterialDetail } from "../../../components/material/components/MaterialDetail";

const Page: React.FC = () => {
  const { id } = useParams();
  // State lưu thông tin chi tiết vật tư
  const [material, setMaterial] = React.useState<any | null>(null);

  // Tải thông tin vật tư khi có ID
  React.useEffect(() => {
    if (id) fetchMaterial(id).then(setMaterial).catch(console.error);
  }, [id]);

  if (!material) return <div>Đang tải...</div>;

  return (
    <div>
      <h1>Chi Tiết Vật Tư (Operator)</h1>
      <MaterialDetail material={material} />
    </div>
  );
};

export default Page;
