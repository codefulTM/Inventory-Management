export class MaterialUsageItemDto {
  material_id: string;
  transaction_count: number;
  total_quantity: number;
}

export class MaterialUsageReportDto {
  generated_at: Date;
  from?: Date;
  to?: Date;
  items: MaterialUsageItemDto[];
}
