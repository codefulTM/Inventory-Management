// === AI SUPPLIER SERVICE ===
// Service phân tích nhà cung cấp bằng AI qua HuggingFace Inference API
// Phân tích tất cả NCC (top 3) hoặc phân tích 1 NCC chi tiết

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HfInference } from '@huggingface/inference';
import { SupplierPerformanceRecord, SupplierAnalysisResponseDto } from './dto/supplier-analysis.dto';

@Injectable()
export class AiSupplierService {
  private readonly logger = new Logger(AiSupplierService.name);
  private hf: HfInference;
  private model: string;

  constructor(private configService: ConfigService) {
    // [RÚT GỌN: Read HUGGINGFACE_API_KEY and HUGGINGFACE_MODEL, init HfInference client]
    throw new Error("Skeleton: not implemented");
  }

  private extractJsonBlock(content: string): string {
    // [RÚT GỌN: Extract JSON from AI response (handles ```json blocks or find { } boundaries)]
    throw new Error("Skeleton: not implemented");
  }

  private pickTop3SuppliersFallback(suppliers: SupplierPerformanceRecord[]): SupplierPerformanceRecord[] {
    // [RÚT GỌN: Select 3 suppliers: rising (high quality, low volume), volume leader, highest rejection]
    throw new Error("Skeleton: not implemented");
  }

  async analyzeAllSuppliers(suppliers: SupplierPerformanceRecord[]): Promise<SupplierAnalysisResponseDto> {
    // [RÚT GỌN: Try AI to pick top 3, fallback to heuristic if AI fails, generate analysis report]
    throw new Error("Skeleton: not implemented");
  }

  async analyzeSingleSupplier(supplier: SupplierPerformanceRecord): Promise<SupplierAnalysisResponseDto> {
    // [RÚT GỌN: Build prompt with supplier data, call HuggingFace chat completion, parse JSON response]
    throw new Error("Skeleton: not implemented");
  }

  async testConnection(): Promise<boolean> {
    // [RÚT GỌN: Make a minimal API call to verify HuggingFace connectivity]
    throw new Error("Skeleton: not implemented");
  }

  private buildSupplierAnalysisPrompt(suppliers: SupplierPerformanceRecord[]): string {
    // [RÚT GỌN: Build structured prompt asking AI to pick top 3 suppliers and explain why]
    throw new Error("Skeleton: not implemented");
  }
}
