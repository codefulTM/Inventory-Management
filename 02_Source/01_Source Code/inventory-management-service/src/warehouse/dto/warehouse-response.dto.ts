export class WarehouseResponseDto {
  _id: string;
  warehouse_id: string;
  warehouse_name: string;
  description?: string;
  is_active: boolean;
  created_date: Date;
  modified_date: Date;
}
