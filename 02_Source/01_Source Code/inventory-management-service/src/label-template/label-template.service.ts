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
import { InventoryLotService } from '../inventory-lot/inventory-lot.service';
import { ProductionBatchService } from '../production-batch/production-batch.service';
import type { InventoryLotResponseDto } from '../inventory-lot/inventory-lot.dto';
import type { ProductionBatchResponseDto } from '../production-batch/production-batch.dto';
import { RedisIdService } from '../redis-id/redis-id.service';

/**
 * LabelTemplate Service
 * Business logic for managing label templates and generating labels
 */
@Injectable()
export class LabelTemplateService {
  private readonly logger = new Logger(LabelTemplateService.name);

  constructor(
    private readonly repository: LabelTemplateRepository,
    private readonly inventoryLotService: InventoryLotService,
    private readonly productionBatchService: ProductionBatchService,
    private readonly redisIdService: RedisIdService,
  ) {}

  /**
   * Create a new label template
   */
  async create(dto: CreateLabelTemplateDto): Promise<LabelTemplateResponseDto> {
    // Auto-generate template_id if not provided
    if (!dto.template_id) {
      dto.template_id = await this.redisIdService.nextId('LBL');
    }
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
   * Each {{placeholder}} in the template is replaced from real lot/batch data.
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

    let sourceData: Record<string, unknown>;
    if (dto.lot_id) {
      const lot = await this.inventoryLotService.findById(dto.lot_id);
      sourceData = this.mapInventoryLotData(lot);
    } else if (dto.batch_id) {
      const batch = await this.productionBatchService.findOne(dto.batch_id);
      sourceData = this.mapProductionBatchData(batch);
    } else {
      throw new BadRequestException('Either lot_id or batch_id is required to generate label');
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

  private mapInventoryLotData(lot: InventoryLotResponseDto): Record<string, unknown> {
    return {
      lot_id: lot.lot_id,
      material_id: lot.material_id,
      manufacturer_name: lot.manufacturer_name,
      manufacturer_lot: lot.manufacturer_lot,
      supplier_name: lot.supplier_name,
      received_date: lot.received_date,
      expiration_date: lot.expiration_date,
      in_use_expiration_date: lot.in_use_expiration_date,
      status: lot.status,
      quantity: lot.quantity,
      unit_of_measure: lot.unit_of_measure,
      storage_location: lot.storage_location,
      is_sample: lot.is_sample,
      parent_lot_id: lot.parent_lot_id,
      notes: lot.notes,
      received_by: lot.received_by,
      qc_by: lot.qc_by,
    };
  }

  private mapProductionBatchData(
    batch: ProductionBatchResponseDto,
  ): Record<string, unknown> {
    return {
      batch_id: batch.batch_id,
      batch_number: batch.batch_number,
      product_id: batch.product_id,
      batch_size: batch.batch_size,
      unit_of_measure: batch.unit_of_measure,
      shelf_life_value: batch.shelf_life_value,
      shelf_life_unit: batch.shelf_life_unit,
      status: batch.status,
      created_by: batch.created_by,
      approved_by: batch.approved_by,
      completed_by: batch.completed_by,
    };
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
