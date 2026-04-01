export interface InventoryTransaction {
  _id?: string;
  transaction_id?: string;
  lot_id: string;
  transaction_type: string;
  quantity: number;
  unit_of_measure: string;
  transaction_date: string;
  reference_number?: string;
  performed_by: string;
  notes?: string;
  created_date?: string;
  modified_date?: string;
  [key: string]: any;
}
