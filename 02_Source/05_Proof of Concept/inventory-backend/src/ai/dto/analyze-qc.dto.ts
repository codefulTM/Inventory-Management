export class AnalyzeQcDto {
  test_type: string;
  test_name: string;
  test_result: string;
  acceptance_criteria: string;
  material_name?: string;
  batch_number?: string;
}

export class AiAnalysisResponseDto {
  success: boolean;
  analysis: string;
  timestamp: string;
  model_used: string;
}
