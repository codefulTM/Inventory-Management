import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { WarehouseRepository } from './warehouse.repository';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseResponseDto } from './dto/warehouse-response.dto';
import { PaginatedWarehouseResponseDto } from './dto/paginated-warehouse-response.dto';
import { RedisIdService } from '../redis-id/redis-id.service';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    private readonly repository: WarehouseRepository,
    private readonly redisIdService: RedisIdService,
  ) {}

  async create(createDto: CreateWarehouseDto): Promise<WarehouseResponseDto> {
    // Auto-generate warehouse_id if not provided
    if (!createDto.warehouse_id) {
      createDto.warehouse_id = await this.redisIdService.nextId('WH');
    }
    this.logger.log(`Creating warehouse: ${createDto.warehouse_id}`);

    const existing = await this.repository.findByWarehouseId(
      createDto.warehouse_id,
    );
    if (existing) {
      this.logger.warn(
        `Duplicate warehouse_id attempted: ${createDto.warehouse_id}`,
      );
      throw new ConflictException(
        `Warehouse with ID '${createDto.warehouse_id}' already exists`,
      );
    }

    const created = await this.repository.create(createDto);
    return this.toResponse(created);
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedWarehouseResponseDto> {
    if (page !== undefined && limit !== undefined)
      return this.findAllWithPagination(page, limit);

    const all = await this.repository.findAllWithoutPagination();
    return {
      data: all.map((w) => this.toResponse(w)),
      pagination: {
        page: 1,
        limit: all.length,
        total: all.length,
        totalPages: 1,
      },
    };
  }

  async findAllWithPagination(
    page = 1,
    limit = 20,
  ): Promise<PaginatedWarehouseResponseDto> {
    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1) throw new BadRequestException('Limit must be >= 1');

    const result = await this.repository.findAllWithPagination(page, limit);
    return {
      data: result.data.map((w) => this.toResponse(w)),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async findById(id: string): Promise<WarehouseResponseDto> {
    const found = await this.repository.findById(id);
    if (!found)
      throw new NotFoundException(`Warehouse with ID '${id}' not found`);
    return this.toResponse(found);
  }

  async search(
    query: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedWarehouseResponseDto> {
    if (!query || query.trim().length === 0)
      throw new BadRequestException('Search query cannot be empty');
    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1) throw new BadRequestException('Limit must be >= 1');

    const result = await this.repository.search(query.trim(), page, limit);
    return {
      data: result.data.map((w) => this.toResponse(w)),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async update(
    id: string,
    updateDto: UpdateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.repository.findById(id);
    if (!warehouse)
      throw new NotFoundException(`Warehouse with ID '${id}' not found`);

    if (updateDto.warehouse_id) {
      const dup = await this.repository.isDuplicate(
        'warehouse_id',
        updateDto.warehouse_id,
        id,
      );
      if (dup)
        throw new ConflictException(
          `warehouse_id '${updateDto.warehouse_id}' already in use`,
        );
    }

    const updated = await this.repository.update(id, updateDto);
    return this.toResponse(updated);
  }

  async delete(id: string) {
    const warehouse = await this.repository.findById(id);
    if (!warehouse)
      throw new NotFoundException(`Warehouse with ID '${id}' not found`);

    await this.repository.delete(id);
    return { message: `Warehouse '${id}' deleted successfully` };
  }

  async getOptions(query?: string, page = 1, limit = 20) {
    if (page < 1) throw new BadRequestException('Page must be >= 1');
    if (limit < 1) throw new BadRequestException('Limit must be >= 1');
    return this.repository.findOptions(query, page, limit);
  }

  private toResponse(doc: any): WarehouseResponseDto {
    return {
      _id: doc._id?.toString() || '',
      warehouse_id: doc.warehouse_id,
      warehouse_name: doc.warehouse_name,
      description: doc.description,
      is_active: doc.is_active,
      created_date: doc.created_date,
      modified_date: doc.modified_date,
    } as WarehouseResponseDto;
  }
}
