// Form values type (dates as string for <input type="date">)
export type EditFormValues = {
  lot_id: string;
  material_id: string;
  manufacturer_name: string;
  manufacturer_lot: string;
  supplier_name: string;
  received_date: string;
  expiration_date: string;
  in_use_expiration_date: string;
  quantity: number;
  unit_of_measure: string;
  storage_location: string;
  status: "Pending" | "Quarantine" | "Accepted" | "Rejected" | "Depleted";
  is_sample: boolean;
  parent_lot_id: string;
  notes: string;
};
