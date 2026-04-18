import { IsOptional, IsString } from 'class-validator';

export class SupplierAnalysisFilterDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export interface SupplierPerformanceRecord {
  supplier_name: string;
  total_batches: number;
  approved: number;
  rejected: number;
  quality_rate: number;
}

export class SupplierAnalysisResponseDto {
  success: boolean;
  analysis: string;
  suppliers_analyzed: number;
  timestamp: string;
  model_used: string;
}
