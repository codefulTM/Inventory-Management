/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * MaterialDetailPage - Trang xem chi tiết vật tư dành cho Manager
 * Chức năng: Hiển thị thông tin chi tiết của một vật tư
 * Bao gồm: mã vật tư, tên, loại, thông số kỹ thuật, điều kiện bảo quản
 * Người tạo, ngày tạo, trạng thái (Pending/Approved/Rejected)
 * Manager có thể xem thông tin đầy đủ để quyết định phê duyệt hoặc từ chối
 */
import React from "react";
import { useParams } from "react-router-dom";
import { fetchMaterial } from "../../../services/materialService";
import { MaterialDetail } from "../../../components/material/components/MaterialDetail";

const Page: React.FC = () => {
  const { id } = useParams(); // Lấy mã vật tư từ URL
  const [material, setMaterial] = React.useState<any | null>(null);

  // Tải thông tin chi tiết vật tư
  React.useEffect(() => {
    if (id) fetchMaterial(id).then(setMaterial).catch(console.error);
  }, [id]);

  if (!material) return <div>Đang tải thông tin vật tư...</div>;

  return (
    <div>
      <h1>Chi tiết vật tư (Manager)</h1>
      <MaterialDetail material={material} />
    </div>
  );
};

export default Page;
