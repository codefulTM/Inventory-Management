/**
 * LabelTemplate API Service
 * Handles all HTTP requests related to Label Templates
 */

import type {
  LabelTemplate,
  CreateLabelTemplateRequest,
  UpdateLabelTemplateRequest,
  GenerateLabelRequest,
  GenerateLabelResponse,
  PaginatedLabelTemplateResponse,
  LabelType,
} from "../types/label";
import { API_ENDPOINTS } from "../config/api.config";
import { apiClient } from "./apiClient";

class LabelService {
  async findAll(
    page = 1,
    limit = 20,
  ): Promise<PaginatedLabelTemplateResponse> {
    const { data, error } = await apiClient.get<PaginatedLabelTemplateResponse>(
      API_ENDPOINTS.LABEL_TEMPLATES,
      { params: { page, limit } },
    );
    if (error) {
      console.error("[LabelService] Error:", {
        status: error.statusCode,
        message: error.message,
      });
      throw error;
    }
    return data!;
  }

  async findById(id: string): Promise<LabelTemplate> {
    const { data, error } = await apiClient.get<LabelTemplate>(
      API_ENDPOINTS.LABEL_TEMPLATES_DETAIL(id),
    );
    if (error) {
      console.error("[LabelService] Error:", {
        status: error.statusCode,
        message: error.message,
      });
      throw error;
    }
    return data!;
  }

  async search(
    query: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedLabelTemplateResponse> {
    const { data, error } = await apiClient.get<PaginatedLabelTemplateResponse>(
      API_ENDPOINTS.LABEL_TEMPLATES_SEARCH,
      { params: { q: query, page, limit } },
    );
    if (error) {
      console.error("[LabelService] Error:", {
        status: error.statusCode,
        message: error.message,
      });
      throw error;
    }
    return data!;
  }

  async filterByType(
    type: LabelType,
    page = 1,
    limit = 20,
  ): Promise<PaginatedLabelTemplateResponse> {
    const { data, error } = await apiClient.get<PaginatedLabelTemplateResponse>(
      API_ENDPOINTS.LABEL_TEMPLATES_FILTER_TYPE(type),
      { params: { page, limit } },
    );
    if (error) {
      console.error("[LabelService] Error:", {
        status: error.statusCode,
        message: error.message,
      });
      throw error;
    }
    return data!;
  }

  async create(dto: CreateLabelTemplateRequest): Promise<LabelTemplate> {
    const { data, error } = await apiClient.post<LabelTemplate>(
      API_ENDPOINTS.LABEL_TEMPLATES,
      dto,
    );
    if (error) {
      console.error("[LabelService] Error:", {
        status: error.statusCode,
        message: error.message,
      });
      throw error;
    }
    return data!;
  }

  async update(
    id: string,
    dto: UpdateLabelTemplateRequest,
  ): Promise<LabelTemplate> {
    const { data, error } = await apiClient.put<LabelTemplate>(
      API_ENDPOINTS.LABEL_TEMPLATES_UPDATE(id),
      dto,
    );
    if (error) {
      console.error("[LabelService] Error:", {
        status: error.statusCode,
        message: error.message,
      });
      throw error;
    }
    return data!;
  }

  async delete(id: string): Promise<{ message: string }> {
    const { data, error } = await apiClient.delete<{ message: string }>(
      API_ENDPOINTS.LABEL_TEMPLATES_DELETE(id),
    );
    if (error) {
      console.error("[LabelService] Error:", {
        status: error.statusCode,
        message: error.message,
      });
      throw error;
    }
    return data!;
  }

  async generateLabel(dto: GenerateLabelRequest): Promise<GenerateLabelResponse> {
    const { data, error } = await apiClient.post<GenerateLabelResponse>(
      API_ENDPOINTS.LABEL_TEMPLATES_GENERATE,
      dto,
    );
    if (error) {
      console.error("[LabelService] Error:", {
        status: error.statusCode,
        message: error.message,
      });
      throw error;
    }
    return data!;
  }
}

export const labelService = new LabelService();
