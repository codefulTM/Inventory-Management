/**
 * DTO for inventory transaction API responses
 */
export class InventoryTransactionResponseDto {
  _id: string;

  transaction_id: string;

  lot_id: string;

  material_id: string;

  transaction_type: string;

  quantity: number;

  unit_of_measure: string;

  transaction_date: Date;

  reference_number?: string;

  performed_by: string;

  notes?: string;

  created_date: Date;

  modified_date: Date;
}
