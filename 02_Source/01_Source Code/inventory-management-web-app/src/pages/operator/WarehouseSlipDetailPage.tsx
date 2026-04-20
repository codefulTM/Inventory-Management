import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import WarehouseSlipDetail from "../../components/operator/warehouse-slip/WarehouseSlipDetail";
import NotFoundPage from "../NotFoundPage";

export default function WarehouseSlipDetailPage() {
  const { id } = useParams();

  if (!id) return <NotFoundPage />;
  return <WarehouseSlipDetail id={id} />;
}
