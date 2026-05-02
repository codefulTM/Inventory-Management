/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * MaterialService - Service xử lý nghiệp vụ quản lý vật tư
 * 
 * Chức năng chính:
 * - Tạo mới vật tư với ID tự động (MAT-XXX từ Redis)
 * - Kiểm tra trùng lặp material_id và part_number
 * - Lấy danh sách vật tư (có phân trang hoặc lấy tất cả)
 * - Tìm kiếm vật tư theo tên, ID, part number
 * - Lọc vật tư theo loại (material_type)
 * - Cập nhật và xóa vật tư
 * - Export dữ liệu ra Excel/PDF
 * 
 * Quy tắc nghiệp vụ:
 * - material_id phải duy nhất
 * - part_number phải duy nhất
 * - Hỗ trợ cả MongoDB ObjectId và business ID (material_id) trong các thao tác
 */
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

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);

  constructor(
    private readonly repository: MaterialRepository,
    private readonly redisIdService: RedisIdService, // Service tạo ID tự động từ Redis
  ) {}

  /**
   * Tạo mới một vật tư
   * Tự động sinh material_id nếu không được cung cấp
   * Kiểm tra trùng lặp material_id và part_number
   * 
   * @param createDto - Dữ liệu tạo vật tư
   * @returns MaterialResponseDto - Thông tin vật tư đã tạo
   * @throws ConflictException nếu material_id hoặc part_number đã tồn tại
   */
  async create(createDto: CreateMaterialDto): Promise<MaterialResponseDto> {
    // Tự động sinh material_id nếu không được cung cấp (dùng Redis)
    if (!createDto.material_id) {
      createDto.material_id = await this.redisIdService.nextId('MAT');
    }
    this.logger.log(`Creating material: ${createDto.material_id}`);

    // Kiểm tra trùng lặp material_id
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

    // Kiểm tra trùng lặp part_number
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

    // Tạo vật tư mới
    const material = await this.repository.create(createDto);
    this.logger.log(`Material created successfully: ${material._id}`);

    return this.toResponseDto(material);
  }

  /**
   * Lấy tất cả vật tư (không phân trang)
   * @returns Danh sách tất cả vật tư
   */
  async findAllWithoutPagination(): Promise<MaterialResponseDto[]> {
    const materials = await this.repository.findAllWithoutPagination();
    return materials.map((m) => this.toResponseDto(m));
  }

  /**
   * Lấy danh sách vật tư - có phân trang hoặc lấy tất cả
   * Nếu không cung cấp page/limit → lấy tất cả (trả về dạng phân trang 1 page)
   * 
   * @param page - Số trang (bắt đầu từ 1), optional
   * @param limit - Số bản ghi mỗi trang, optional
   * @returns PaginatedMaterialResponseDto - Dữ liệu phân trang
   */
  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedMaterialResponseDto> {
    // Nếu có page và limit → dùng phân trang
    if (page !== undefined && limit !== undefined) {
      return this.findAllWithPagination(page, limit);
    }

    // Ngược lại lấy tất cả
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
   * Lấy danh sách vật tư có phân trang
   * 
   * @param page - Số trang (bắt đầu từ 1)
   * @param limit - Số bản ghi mỗi trang (tối đa 100)
   * @returns PaginatedMaterialResponseDto - Dữ liệu phân trang
   * @throws BadRequestException nếu page hoặc limit không hợp lệ
   */
  async findAllWithPagination(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedMaterialResponseDto> {
    // Validate tham số phân trang
    if (page < 1) {
      throw new BadRequestException('Page must be >= 1');
    }
    if (limit < 1) {
      throw new BadRequestException('Limit must be >= 1');
    }
    if (limit > 100) {
      this.logger.warn(`Limit capped at 100, requested: ${limit}`);
      limit = 100; // Giới hạn tối đa 100 bản ghi/trang
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
   * Tìm vật tư theo ID
   * Hỗ trợ cả MongoDB ObjectId và business material_id
   * 
   * @param id - MongoDB ObjectId hoặc material_id (ví dụ: "MAT-002")
   * @returns MaterialResponseDto - Thông tin vật tư
   * @throws NotFoundException nếu không tìm thấy
   */
  async findById(id: string): Promise<MaterialResponseDto> {
    this.logger.debug(`Finding material by ID: ${id}`);

    // Chấp nhận cả MongoDB ObjectId và business material_id
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
   * Tìm kiếm vật tư theo từ khóa
   * Tìm trong các trường: material_name, material_id, part_number
   * 
   * @param query - Từ khóa tìm kiếm (tối thiểu 2 ký tự)
   * @param page - Số trang
   * @param limit - Số bản ghi mỗi trang
   * @returns PaginatedMaterialResponseDto - Kết quả tìm kiếm phân trang
   * @throws BadRequestException nếu query rỗng hoặc quá ngắn
   */
  async search(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedMaterialResponseDto> {
    // Validate từ khóa tìm kiếm
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    if (query.trim().length < 2) {
      throw new BadRequestException(
        'Search query must be at least 2 characters',
      );
    }

    // Validate phân trang
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
   * Lọc vật tư theo loại (material_type)
   * 
   * @param type - Loại vật tư (API, Excipient, Dietary Supplement...)
   * @param page - Số trang
   * @param limit - Số bản ghi mỗi trang
   * @returns PaginatedMaterialResponseDto - Kết quả lọc phân trang
   * @throws BadRequestException nếu loại vật tư không hợp lệ
   */
  async filterByType(
    type: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedMaterialResponseDto> {
    // Các loại vật tư hợp lệ
    const validTypes = [
      'API',
      'Excipient',
      'Dietary Supplement',
      'Container',
      'Closure',
      'Process Chemical',
      'Testing Material',
    ];

    // Validate loại vật tư
    if (!validTypes.includes(type)) {
      this.logger.warn(`Invalid material type attempted: ${type}`);
      throw new BadRequestException(
        `Invalid material type '${type}'. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    // Validate phân trang
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
   * Cập nhật thông tin vật tư
   * Hỗ trợ cả MongoDB ObjectId và business material_id
   * 
   * @param id - MongoDB ObjectId hoặc material_id
   * @param updateDto - Dữ liệu cập nhật
   * @returns MaterialResponseDto - Thông tin vật tư sau khi cập nhật
   * @throws NotFoundException nếu không tìm thấy vật tư
   */
  async update(
    id: string,
    updateDto: UpdateMaterialDto,
  ): Promise<MaterialResponseDto> {
    this.logger.log(`Updating material: ${id}`);

    // Xác định ID (ObjectId hoặc material_id) và lấy _id thực sự
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

    // Thực hiện cập nhật sử dụng MongoDB _id
    const updated = await this.repository.update(resolvedId, updateDto);
    this.logger.log(`Material updated successfully: ${id}`);

    return this.toResponseDto(updated);
  }

  /**
   * Xóa vật tư
   * Hỗ trợ cả MongoDB ObjectId và business material_id
   * 
   * @param id - MongoDB ObjectId hoặc material_id
   * @returns Thông báo xóa thành công
   * @throws NotFoundException nếu không tìm thấy vật tư
   */
  async delete(id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting material: ${id}`);

    // Xác định ID (ObjectId hoặc material_id)
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

    // Xóa vật tư sử dụng MongoDB _id
    await this.repository.delete(resolvedId);
    this.logger.log(`Material deleted successfully: ${id}`);

    return { message: `Material '${id}' deleted successfully` };
  }

  /**
   * Xóa vật tư (dành cho test compatibility)
   * Trả về { deleted: boolean } thay vì throw exception
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
   * Lấy danh sách các loại vật tư duy nhất
   * @returns Array các loại vật tư
   */
  async getDistinctTypes(): Promise<string[]> {
    this.logger.debug('Fetching distinct material types');
    return this.repository.getDistinctTypes();
  }

  /**
   * Lấy danh sách vật tư dạng options (dùng cho dropdown)
   * Có thể lọc theo từ khóa và trạng thái
   */
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
   * Export danh sách vật tư ra file Excel
   * @param materials - Danh sách vật tư cần export
   * @returns Buffer - Dữ liệu file Excel
   */
  async exportToExcel(materials: any[]): Promise<Buffer> {
    const XLSX = await import('xlsx');

    // Chuyển đổi dữ liệu sang định dạng worksheet
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

    // Cài đặt độ rộng cột
    const columnWidths = [15, 15, 25, 15, 20, 15, 15];
    worksheet['!cols'] = columnWidths.map((w) => ({ wch: w }));

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return buffer;
  }

  /**
   * Export danh sách vật tư ra file PDF
   * @param materials - Danh sách vật tư cần export
   * @returns Buffer - Dữ liệu file PDF
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

      // Thêm tiêu đề
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Material List', { align: 'center' });
      doc.moveDown();

      // Thêm metadata
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Generated: ${new Date().toLocaleString()}`);
      doc.text(`Total Records: ${materials.length}`);
      doc.moveDown();

      // Thêm header của bảng
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

      // Thêm các dòng dữ liệu
      doc.font('Helvetica').fontSize(8);
      materials.forEach((material) => {
        const y = doc.y;

        // Vẽ nội dung dòng
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

        // Thêm trang mới nếu cần
        if (doc.y > 750) {
          doc.addPage();
        }
      });

      // Thêm footer
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
   * Chuyển đổi Material document sang MaterialResponseDto
   * Loại bỏ các field không cần thiết, format dữ liệu
   * 
   * @param material - Mongoose Material document
   * @returns MaterialResponseDto - Dữ liệu trả về cho client
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
