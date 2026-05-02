/**
 * Material Form Page (Operator)
 * Trang tạo mới hoặc chỉnh sửa vật tư dành cho Operator
 * 
 * Chức năng chính:
 * - Tạo vật tư mới (khi không có ID trên URL)
 * - Chỉnh sửa vật tư hiện có (khi có ID trên URL)
 * - Form bao gồm: mã vật tư, tên, loại, đơn vị tính, thông số kỹ thuật
 * - Sau khi lưu thành công sẽ chuyển về trang danh sách
 * 
 * Lưu ý: Trang này có thể bị hạn chế quyền tùy thuộc vào cấu hình hệ thống
 * Thông thường chỉ Manager mới có quyền tạo/sửa vật tư
 */
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MaterialForm } from "../../../components/material/components/MaterialForm";
import { fetchMaterial } from "../../../services/materialService";
import { type Material } from "../../../types/material";

const Page: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  // State lưu thông tin vật tư hiện có (khi chỉnh sửa)
  const [initial, setInitial] = React.useState<Material | undefined>(undefined);

  // Tải thông tin vật tư khi có ID (chế độ chỉnh sửa)
  React.useEffect(() => {
    if (id)
      fetchMaterial(id)
        .then((m: Material) => setInitial(m))
        .catch(console.error);
  }, [id]);

  return (
    <div>
      <h1>{id ? "Chỉnh Sửa Vật Tư" : "Tạo Vật Tư Mới"}</h1>
      <MaterialForm
        mode={id ? "edit" : "create"}
        existingMaterial={initial}
        onSuccess={() => navigate("/operator/materials")}
        onCancel={() => navigate("/operator/materials")}
      />
    </div>
  );
};

export default Page;
