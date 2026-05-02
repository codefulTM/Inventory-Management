/**
 * MaterialFormPage - Trang tạo mới/chỉnh sửa vật tư dành cho Manager
 * Chức năng: Form nhập liệu để tạo mới hoặc cập nhật thông tin vật tư
 * Thông tin vật tư gồm: mã vật tư, tên, loại, điều kiện bảo quản, tài liệu tiêu chuẩn
 * Manager có thể thêm mới vật tư vào hệ thống hoặc chỉnh sửa thông tin vật tư đã tồn tại
 */
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MaterialForm } from "../../../components/material/components/MaterialForm";
import { fetchMaterial } from "../../../services/materialService";
import { type Material } from "../../../types/material";

const Page: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Lấy ID từ URL (nếu có thì là edit mode)
  const [initial, setInitial] = React.useState<Material | undefined>(undefined);

  // Nếu có ID => chế độ chỉnh sửa: tải thông tin vật tư hiện tại
  React.useEffect(() => {
    if (id)
      fetchMaterial(id)
        .then((m: Material) => setInitial(m))
        .catch(console.error);
  }, [id]);

  return (
    <div>
      <h1>{id ? "Chỉnh sửa vật tư (Manager)" : "Tạo vật tư mới (Manager)"}</h1>
      <MaterialForm
        mode={id ? "edit" : "create"}
        existingMaterial={initial}
        onSuccess={() => navigate("/manager/materials")}
        onCancel={() => navigate("/manager/materials")}
      />
    </div>
  );
};

export default Page;
