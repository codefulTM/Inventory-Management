export class InventoryStatusItemDto {
  material_id: string;
  lot_id: string;
  quantity: number;
  status: string;
  expiration_date?: Date;
}

export class InventoryStatusReportDto {
  generated_at: Date;
  total_lots: number;
  items: InventoryStatusItemDto[];
}
