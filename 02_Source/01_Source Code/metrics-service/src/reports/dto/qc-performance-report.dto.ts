export class QcPerformanceItemDto {
  supplier_name: string;
  approved: number;
  rejected: number;
  quality_rate: number;
}

export class QcPerformanceReportDto {
  generated_at: Date;
  items: QcPerformanceItemDto[];
}
