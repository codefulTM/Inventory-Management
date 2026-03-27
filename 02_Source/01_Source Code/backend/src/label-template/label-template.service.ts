import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { LabelTemplateRepository } from './label-template.repository';
import {
  CreateLabelTemplateDto,
  UpdateLabelTemplateDto,
  GenerateLabelDto,
  LabelTemplateResponseDto,
  PaginatedLabelTemplateResponseDto,
  LabelType,
} from './label-template.dto';
import type { LabelTemplateDocument } from '../schemas/label-template.schema';

/**
 * Mock data for InventoryLot fields used in label generation.
 * TODO: Replace with real InventoryLotService injection when fully integrated.
 */
const MOCK_LOT_DATA: Record<string, unknown> = {
  lot_id: 'LOT-MOCK-001',
  material_id: 'MAT-001',
  material_name: 'Acetaminophen API',
  manufacturer_name: 'PharmaCorp Ltd.',
  manufacturer_lot: 'PC-2025-0045',
  supplier_name: 'Global Pharma Supply',
  received_date: '2025-11-15',
  expiration_date: '2027-11-15',
  status: 'Quarantine',
  quantity: '50.000',
  unit_of_measure: 'kg',
  storage_location: 'Kho A - Kệ 3',
};

/**
 * Mock data for ProductionBatch fields used in label generation.
 * TODO: Replace with real ProductionBatchService injection when fully integrated.
 */
const MOCK_BATCH_DATA: Record<string, unknown> = {
  batch_id: 'BATCH-MOCK-001',
  batch_number: 'PB-2025-0001',
  product_name: 'Paracetamol Tablet 500mg',
  product_id: 'MAT-PROD-001',
  batch_size: '10000.000',
  unit_of_measure: 'tablets',
  manufacture_date: '2025-12-01',
  expiration_date: '2027-12-01',
  status: 'Complete',
};

/**
 * LabelTemplate Service
 * Business logic for managing label templates and generating labels
 */
@Injectable()
export class LabelTemplateService {
  private readonly logger = new Logger(LabelTemplateService.name);

  constructor(private readonly repository: LabelTemplateRepository) {}

  /**
   * Create a new label template
   */
  async create(dto: CreateLabelTemplateDto): Promise<LabelTemplateResponseDto> {
    this.logger.log(`Creating label template: ${dto.template_id}`);

    const existing = await this.repository.findByTemplateId(dto.template_id);
    if (existing) {
      throw new ConflictException(
        `LabelTemplate with ID '${dto.template_id}' already exists`,
      );
    }

    const doc = await this.repository.create(dto);
    return this.toResponseDto(doc);
  }

  /**
   * Get all label templates with pagination
   */
  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedLabelTemplateResponseDto> {
    if (page !== undefined && page < 1) {
      throw new BadRequestException('Page must be >= 1');
    }
    if (limit !== undefined && limit < 1) {
      throw new BadRequestException('Limit must be >= 1');
    }

    // If page/limit không truyền thì lấy toàn bộ hoặc mặc định từ repository
    if (page === undefined || limit === undefined) {
      const result = await this.repository.findAll();
      return this.toPaginatedResponse(result);
    }

    if (limit > 100) limit = 100;

    const result = await this.repository.findAll(page, limit);
    return this.toPaginatedResponse(result);
  }

  /**
   * Get label template by MongoDB _id
   */
  async findById(id: string): Promise<LabelTemplateResponseDto> {
    const doc = await this.repository.findById(id);
    if (!doc) {
      throw new NotFoundException(`LabelTemplate with id '${id}' not found`);
    }
    return this.toResponseDto(doc);
  }

  /**
   * Filter label templates by label_type
   */
  async filterByType(
    labelType: LabelType,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedLabelTemplateResponseDto> {
    const result = await this.repository.findByLabelType(
      labelType,
      page,
      limit,
    );
    return this.toPaginatedResponse(result);
  }

  /**
   * Search label templates by template_id or template_name
   */
  async search(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedLabelTemplateResponseDto> {
    const result = await this.repository.search(query, page, limit);
    return this.toPaginatedResponse(result);
  }

  /**
   * Update an existing label template
   */
  async update(
    id: string,
    dto: UpdateLabelTemplateDto,
  ): Promise<LabelTemplateResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`LabelTemplate with id '${id}' not found`);
    }
    const updated = await this.repository.update(id, dto);
    return this.toResponseDto(updated!);
  }

  /**
   * Delete a label template
   */
  async delete(id: string): Promise<{ message: string }> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`LabelTemplate with id '${id}' not found`);
    }
    await this.repository.delete(id);
    return {
      message: `LabelTemplate '${existing.template_id}' deleted successfully`,
    };
  }

  /**
   * Generate label content by populating template with entity data.
   * Uses mock data for InventoryLot / ProductionBatch until those modules
   * are fully integrated. Each {{placeholder}} in the template is replaced.
   */
  async generateLabel(dto: GenerateLabelDto): Promise<{
    template: LabelTemplateResponseDto;
    populatedContent: string;
    sourceData: Record<string, unknown>;
    generatedAt: string;
  }> {
    const template = await this.repository.findByTemplateId(dto.template_id);
    if (!template) {
      throw new NotFoundException(
        `LabelTemplate '${dto.template_id}' not found`,
      );
    }

    // Determine source data — use mock data with TODO for real integration
    let sourceData: Record<string, unknown>;
    if (dto.lot_id) {
      // TODO: Replace with InventoryLotService.findByLotId(dto.lot_id)
      sourceData = { ...MOCK_LOT_DATA, lot_id: dto.lot_id };
    } else if (dto.batch_id) {
      // TODO: Replace with ProductionBatchService.findByBatchId(dto.batch_id)
      sourceData = { ...MOCK_BATCH_DATA, batch_id: dto.batch_id };
    } else {
      sourceData = { ...MOCK_LOT_DATA };
    }

    const populatedContent = this.populateTemplate(
      template.template_content,
      sourceData,
    );

    return {
      template: this.toResponseDto(template),
      populatedContent,
      sourceData,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Replace {{key}} placeholders in template_content with values from data
   */
  private populateTemplate(
    content: string,
    data: Record<string, unknown>,
  ): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      const value = data[key];
      return value !== undefined && value !== null
        ? String(value)
        : `{{${key}}}`;
    });
  }

  private toResponseDto(doc: LabelTemplateDocument): LabelTemplateResponseDto {
    return {
      _id: (doc._id as { toString(): string }).toString(),
      template_id: doc.template_id,
      template_name: doc.template_name,
      label_type: doc.label_type as LabelType,
      template_content: doc.template_content,
      width: parseFloat(doc.width.toString()),
      height: parseFloat(doc.height.toString()),
      created_date: (doc as unknown as { created_date: Date }).created_date,
      modified_date: (doc as unknown as { modified_date: Date }).modified_date,
    };
  }

  private toPaginatedResponse(result: {
    data: LabelTemplateDocument[];
    total: number;
    page: number;
    limit: number;
  }): PaginatedLabelTemplateResponseDto {
    return {
      data: result.data.map((d) => this.toResponseDto(d)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }
}
