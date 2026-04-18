export const LABEL_TYPES = [
  'Raw Material',
  'Sample',
  'Intermediate',
  'Finished Product',
  'API',
  'Status',
] as const;

export type LabelType = (typeof LABEL_TYPES)[number];

export interface LabelTemplate {
  _id: string;
  template_id: string;
  template_name: string;
  label_type: LabelType;
  template_content: string;
  width: number;
  height: number;
  created_date: string;
  modified_date: string;
}

export interface CreateLabelTemplateRequest {
  template_id: string;
  template_name: string;
  label_type: LabelType;
  template_content: string;
  width: number;
  height: number;
}

export interface UpdateLabelTemplateRequest {
  template_name?: string;
  label_type?: LabelType;
  template_content?: string;
  width?: number;
  height?: number;
}

export interface GenerateLabelRequest {
  template_id: string;
  lot_id?: string;
  batch_id?: string;
}

export interface GenerateLabelResponse {
  template: LabelTemplate;
  populatedContent: string;
  sourceData: Record<string, unknown>;
  generatedAt: string;
}

export interface PaginatedLabelTemplateResponse {
  data: LabelTemplate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LabelTemplateSearchParams {
  page?: number;
  limit?: number;
  q?: string;
  type?: LabelType;
}
