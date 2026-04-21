/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { MaterialRepository } from './material.repository';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialResponseDto,
  PaginatedMaterialResponseDto,
} from './material.dto';
import { RedisIdService } from '../redis-id/redis-id.service';

/**
 * Material Service
 * Contains business logic for Material operations
 */
@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);

  constructor(
    private readonly repository: MaterialRepository,
    private readonly redisIdService: RedisIdService,
  ) {}

  /**
   * Create a new material
   * Validates unique constraints: material_id, part_number
   * @param createDto - Material creation data
   * @returns - Created material response
   * @throws ConflictException - If material_id or part_number already exists
   */
  async create(createDto: CreateMaterialDto): Promise<MaterialResponseDto> {
    // Auto-generate material_id if not provided
    if (!createDto.material_id) {
      createDto.material_id = await this.redisIdService.nextId('MAT');
    }
    this.logger.log(`Creating material: ${createDto.material_id}`);

    // Check for duplicate material_id
    const existingById = await this.repository.findByMaterialId(
      createDto.material_id,
    );
    if (existingById) {
      this.logger.warn(
        `Duplicate material_id attempted: ${createDto.material_id}`,
      );
      throw new ConflictException(
        `Material with ID '${createDto.material_id}' already exists`,
      );
    }

    // Check for duplicate part_number
    const existingByPartNumber = await this.repository.findByPartNumber(
      createDto.part_number,
    );
    if (existingByPartNumber) {
      this.logger.warn(
        `Duplicate part_number attempted: ${createDto.part_number}`,
      );
      throw new ConflictException(
        `Part number '${createDto.part_number}' already exists`,
      );
    }

    // Create the material
    const material = await this.repository.create(createDto);
    this.logger.log(`Material created successfully: ${material._id}`);

    return this.toResponseDto(material);
  }

  /**
   * Get all materials without pagination
   * @returns - List of all material responses
   */
  async findAllWithoutPagination(): Promise<MaterialResponseDto[]> {
    const materials = await this.repository.findAllWithoutPagination();
    return materials.map((m) => this.toResponseDto(m));
  }

  /**
   * Get all materials; returns unified pagination response
   * page/limit optional; when undefined returns all results as one page
   */
  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedMaterialResponseDto> {
    if (page !== undefined && limit !== undefined) {
      return this.findAllWithPagination(page, limit);
    }

    const all = await this.findAllWithoutPagination();
    return {
      data: all,
      pagination: {
        page: 1,
        limit: all.length,
        total: all.length,
        totalPages: 1,
      },
    };
  }

  /**
   * Get all materials with pagination
   * @param page - Page number (1-indexed)
   * @param limit - Records per page
   * @returns - Paginated materials response
   * @throws BadRequestException - If page or limit is invalid
   */
  async findAllWithPagination(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedMaterialResponseDto> {
    // Validate pagination parameters
    if (page < 1) {
      throw new BadRequestException('Page must be >= 1');
    }
    if (limit < 1) {
      throw new BadRequestException('Limit must be >= 1');
    }
    if (limit > 100) {
      this.logger.warn(`Limit capped at 100, requested: ${limit}`);
      limit = 100; // Cap max limit to 100
    }

    this.logger.debug(`Finding all materials - page: ${page}, limit: ${limit}`);

    const result = await this.repository.findAllWithPagination(page, limit);

    return {
      data: result.data.map((m) => this.toResponseDto(m)),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * Get single material by MongoDB ID
   * @param id - MongoDB ObjectId
   * @returns - Material response
   * @throws NotFoundException - If material not found
   */
  async findById(id: string): Promise<MaterialResponseDto> {
    this.logger.debug(`Finding material by ID: ${id}`);

    // Accept either a MongoDB ObjectId or the business `material_id` (e.g. "MAT-002").
    let material;
    if (isValidObjectId(id)) {
      material = await this.repository.findById(id);
    } else {
      material = await this.repository.findByMaterialId(id);
    }

    if (!material) {
      this.logger.warn(`Material not found: ${id}`);
      throw new NotFoundException(`Material with ID '${id}' not found`);
    }

    return this.toResponseDto(material);
  }

  /**
   * Search materials by multiple fields
   * Searches in: material_name, material_id, part_number
   * @param query - Search query string
   * @param page - Page number (1-indexed)
   * @param limit - Records per page
   * @returns - Paginated search results
   * @throws BadRequestException - If query is empty
   */
  async search(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedMaterialResponseDto> {
    // Validate search query
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    if (query.trim().length < 2) {
      throw new BadRequestException(
        'Search query must be at least 2 characters',
      );
    }

    // Validate pagination parameters
    if (page < 1) {
      throw new BadRequestException('Page must be >= 1');
    }
    if (limit < 1) {
      throw new BadRequestException('Limit must be >= 1');
    }

    this.logger.debug(
      `Searching materials with query: '${query}' - page: ${page}, limit: ${limit}`,
    );

    const result = await this.repository.search(query.trim(), page, limit);

    return {
      data: result.data.map((m) => this.toResponseDto(m)),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Filter materials by material_type
   * @param type - Material type
   * @param page - Page number (1-indexed)
   * @param limit - Records per page
   * @returns - Paginated filtered results
   * @throws BadRequestException - If material type is invalid
   */
  async filterByType(
    type: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedMaterialResponseDto> {
    // Define valid material types
    const validTypes = [
      'API',
      'Excipient',
      'Dietary Supplement',
      'Container',
      'Closure',
      'Process Chemical',
      'Testing Material',
    ];

    // Validate material type
    if (!validTypes.includes(type)) {
      this.logger.warn(`Invalid material type attempted: ${type}`);
      throw new BadRequestException(
        `Invalid material type '${type}'. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    // Validate pagination parameters
    if (page < 1) {
      throw new BadRequestException('Page must be >= 1');
    }
    if (limit < 1) {
      throw new BadRequestException('Limit must be >= 1');
    }

    this.logger.debug(
      `Filtering materials by type: ${type} - page: ${page}, limit: ${limit}`,
    );

    const result = await this.repository.filterByType(type, page, limit);

    return {
      data: result.data.map((m) => this.toResponseDto(m)),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Update material
   * @param id - MongoDB ObjectId
   * @param updateDto - Fields to update
   * @returns - Updated material response
   * @throws NotFoundException - If material not found
   */
  async update(
    id: string,
    updateDto: UpdateMaterialDto,
  ): Promise<MaterialResponseDto> {
    this.logger.log(`Updating material: ${id}`);

    // Resolve whether `id` is an ObjectId or a business `material_id` and
    // obtain the real Mongo `_id` to perform updates safely.
    let material = null as any;
    let resolvedId = id;
    if (isValidObjectId(id)) {
      material = await this.repository.findById(id);
    } else {
      material = await this.repository.findByMaterialId(id);
      if (material) resolvedId = material._id?.toString();
    }

    if (!material) {
      this.logger.warn(`Material not found for update: ${id}`);
      throw new NotFoundException(`Material with ID '${id}' not found`);
    }

    // Perform the update using resolved MongoDB _id
    const updated = await this.repository.update(resolvedId, updateDto);
    this.logger.log(`Material updated successfully: ${id}`);

    return this.toResponseDto(updated);
  }

  /**
   * Delete material
   * @param id - MongoDB ObjectId
   * @returns - Deletion confirmation message
   * @throws NotFoundException - If material not found
   */
  async delete(id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting material: ${id}`);

    // Resolve either MongoDB ObjectId or business material_id
    let material = null as any;
    let resolvedId = id;
    if (isValidObjectId(id)) {
      material = await this.repository.findById(id);
    } else {
      material = await this.repository.findByMaterialId(id);
      if (material) resolvedId = material._id?.toString();
    }

    if (!material) {
      this.logger.warn(`Material not found for deletion: ${id}`);
      throw new NotFoundException(`Material with ID '${id}' not found`);
    }

    // Delete the material using resolved MongoDB _id
    await this.repository.delete(resolvedId);
    this.logger.log(`Material deleted successfully: ${id}`);

    return { message: `Material '${id}' deleted successfully` };
  }

  /**
   * Remove material (for test compatibility)
   * @param id - MongoDB ObjectId
   * @returns - { deleted: boolean }
   */
  async remove(id: string): Promise<{ deleted: boolean }> {
    try {
      await this.delete(id);
      return { deleted: true };
    } catch (e) {
      return { deleted: false };
    }
  }

  /**
   * Get all distinct material types
   * @returns - Array of unique material types
   */
  async getDistinctTypes(): Promise<string[]> {
    this.logger.debug('Fetching distinct material types');
    return this.repository.getDistinctTypes();
  }

  async getOptions(
    query?: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    if (page < 1) {
      throw new BadRequestException('Page must be >= 1');
    }

    if (limit < 1) {
      throw new BadRequestException('Limit must be >= 1');
    }

    const safeLimit = Math.min(limit, 100);
    return this.repository.findOptions(query, status, page, safeLimit);
  }

  /**
   * Export materials to Excel format
   * @param materials - Array of materials to export
   * @returns - Excel buffer
   */
  async exportToExcel(materials: any[]): Promise<Buffer> {
    const XLSX = await import('xlsx');

    const worksheetData = materials.map((m) => ({
      'Material ID': m.material_id,
      'Part Number': m.part_number,
      'Material Name': m.material_name,
      'Material Type': m.material_type,
      'Storage Conditions': m.storage_conditions || '-',
      'Created Date': m.created_date,
      'Modified Date': m.modified_date,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Materials');

    // Set column widths
    const columnWidths = [15, 15, 25, 15, 20, 15, 15];
    worksheet['!cols'] = columnWidths.map((w) => ({ wch: w }));

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return buffer;
  }

  /**
   * Export materials to PDF format
   * @param materials - Array of materials to export
   * @returns - PDF buffer
   */
  async exportToPDF(materials: any[]): Promise<Buffer> {
    const PDFDocument = await import('pdfkit');
    const { default: PdfDoc } = PDFDocument;

    return new Promise((resolve, reject) => {
      const doc = new PdfDoc({
        size: 'A4',
        margin: 40,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', reject);

      // Add title
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Material List', { align: 'center' });
      doc.moveDown();

      // Add metadata
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Generated: ${new Date().toLocaleString()}`);
      doc.text(`Total Records: ${materials.length}`);
      doc.moveDown();

      // Add table header
      const tableTop = doc.y;
      const colWidths = {
        id: 50,
        partNum: 60,
        name: 120,
        type: 70,
        storage: 120,
      };

      doc.fontSize(9).font('Helvetica-Bold');
      const headerY = doc.y;
      doc.text('Material ID', 40, headerY);
      doc.text('Part Number', 40 + colWidths.id, headerY);
      doc.text('Material Name', 40 + colWidths.id + colWidths.partNum, headerY);
      doc.text(
        'Type',
        40 + colWidths.id + colWidths.partNum + colWidths.name,
        headerY,
      );
      doc.moveDown();

      // Add rows
      doc.font('Helvetica').fontSize(8);
      materials.forEach((material) => {
        const y = doc.y;

        // Draw row content
        doc.text(material.material_id || '-', 40, y, {
          width: colWidths.id,
          ellipsis: true,
        });
        doc.text(material.part_number || '-', 40 + colWidths.id, y, {
          width: colWidths.partNum,
          ellipsis: true,
        });
        doc.text(
          material.material_name || '-',
          40 + colWidths.id + colWidths.partNum,
          y,
          {
            width: colWidths.name,
            ellipsis: true,
          },
        );
        doc.text(
          material.material_type || '-',
          40 + colWidths.id + colWidths.partNum + colWidths.name,
          y,
          {
            width: colWidths.type,
            ellipsis: true,
          },
        );

        doc.moveDown(1.5);

        // Add page break if needed
        if (doc.y > 750) {
          doc.addPage();
        }
      });

      // Add footer
      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .text('Inventory Management System', 40, 750, {
          align: 'center',
          width: doc.page.width - 80,
        });

      doc.end();
    });
  }

  /**
   * Convert Material document to response DTO
   * @param material - Mongoose Material document
   * @returns - MaterialResponseDto
   */
  private toResponseDto(material: any): MaterialResponseDto {
    return {
      _id: material._id?.toString() || '',
      material_id: material.material_id,
      part_number: material.part_number,
      material_name: material.material_name,
      material_type: material.material_type,
      storage_conditions: material.storage_conditions,
      specification_document: material.specification_document,
      created_date: material.created_date,
      modified_date: material.modified_date,
      created_by: material.created_by,
      approved_by: material.approved_by,
      status: material.status,
    };
  }
}
