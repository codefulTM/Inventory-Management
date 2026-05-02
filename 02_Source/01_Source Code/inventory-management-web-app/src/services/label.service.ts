/**
 * LabelTemplate API Service
 * Handles all HTTP requests related to Label Templates
 * Service quản lý các thao tác với Label Template (nhãn/barcode/QR)
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
  /**
   * Lấy tất cả mẫu nhãn (phân trang)
   * @param page - Trang hiện tại (mặc định 1)
   * @param limit - Số lượng mỗi trang (mặc định 20)
   * @returns Danh sách mẫu nhãn phân trang
   */
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

  /**
   * Lấy chi tiết một mẫu nhãn theo ID
   * @param id - ID của mẫu nhãn
   * @returns Thông tin chi tiết mẫu nhãn
   */
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

  /**
   * Tìm kiếm mẫu nhãn theo từ khóa
   * @param query - Từ khóa tìm kiếm
   * @param page - Trang hiện tại
   * @param limit - Số lượng mỗi trang
   * @returns Danh sách mẫu nhãn phù hợp (phân trang)
   */
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

  /**
   * Lọc mẫu nhãn theo loại (LabelType)
   * @param type - Loại nhãn (barcode, qr, v.v.)
   * @param page - Trang hiện tại
   * @param limit - Số lượng mỗi trang
   * @returns Danh sách mẫu nhãn thuộc loại chỉ định (phân trang)
   */
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

  /**
   * Tạo mới một mẫu nhãn
   * @param dto - Dữ liệu mẫu nhãn (tên, loại, template_config, v.v.)
   * @returns Mẫu nhãn đã tạo
   */
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

  /**
   * Cập nhật mẫu nhãn hiện có
   * @param id - ID của mẫu nhãn cần cập nhật
   * @param dto - Dữ liệu cập nhật
   * @returns Mẫu nhãn sau khi cập nhật
   */
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

  /**
   * Xóa một mẫu nhãn
   * @param id - ID của mẫu nhãn cần xóa
   * @returns Thông báo kết quả
   */
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

  /**
   * Tạo nhãn từ mẫu (generate label from template)
   * @param dto - Tham số tạo nhãn (template_id, data variables, v.v.)
   * @returns Dữ liệu nhãn đã tạo (URL hình ảnh hoặc dữ liệu nhãn)
   */
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
