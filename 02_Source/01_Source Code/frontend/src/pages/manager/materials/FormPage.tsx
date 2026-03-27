import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MaterialForm } from "../../../components/material/components/MaterialForm";
import {
  createMaterial,
  updateMaterial,
  fetchMaterial,
} from "../../../services/materialService";
import { type Material } from "../../../types/Material";

const Page: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [initial, setInitial] = React.useState<Material | undefined>(undefined);

  React.useEffect(() => {
    if (id)
      fetchMaterial(id)
        .then((m: Material) => setInitial(m))
        .catch(console.error);
  }, [id]);

  const handleSubmit = async (values: Partial<Material>) => {
    try {
      if (id) await updateMaterial(id, values);
      else await createMaterial(values);
      navigate("/manager/materials");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <h1>{id ? "Edit Material" : "Create Material"}</h1>
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
