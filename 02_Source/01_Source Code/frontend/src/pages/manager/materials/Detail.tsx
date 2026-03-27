import React from "react";
import { useParams } from "react-router-dom";
import { fetchMaterial } from "../../../services/materialService";
import { MaterialDetail } from "../../../components/material/components/MaterialDetail";

const Page: React.FC = () => {
  const { id } = useParams();
  const [material, setMaterial] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (id) fetchMaterial(id).then(setMaterial).catch(console.error);
  }, [id]);

  if (!material) return <div>Loading...</div>;

  return (
    <div>
      <h1>Material (Manager) - Detail</h1>
      <MaterialDetail material={material} />
    </div>
  );
};

export default Page;
