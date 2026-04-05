/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Material, MaterialDocument } from '../schemas/material.schema';
import { CreateMaterialDto, UpdateMaterialDto } from './material.dto';

/**
 * Material Repository
 * Handles all database operations for Materials collection
 */
@Injectable()
export class MaterialRepository {
  private readonly logger = new Logger(MaterialRepository.name);

  constructor(
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
  ) {}

  /**
   * Create a new material record
   * @param createDto - Material creation data
   * @returns - Created material document
   */
  async create(createDto: CreateMaterialDto): Promise<MaterialDocument> {
    this.logger.debug(`Creating material: ${createDto.material_id}`);
    const newMaterial = new this.materialModel(createDto);
    return newMaterial.save();
  }

  /**
   * Find all materials without pagination
   * @returns - List of all material documents
   */
  async findAllWithoutPagination(): Promise<MaterialDocument[]> {
    return this.materialModel.find().exec();
  }

  /**
   * Find all materials with pagination support
   * @param page - Page number (1-indexed)
   * @param limit - Records per page
   * @returns - Paginated materials with metadata
   */
  async findAllWithPagination(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: MaterialDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.debug(`Finding materials - page: ${page}, limit: ${limit}`);

    const skip = (page - 1) * limit;
    const data = await this.materialModel
      .find()
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 }) // Sort by newest first
      .exec();

    const total = await this.materialModel.countDocuments();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find material by MongoDB _id
   * @param id - MongoDB ObjectId
   * @returns - Material document or null
   */
  async findById(id: string): Promise<MaterialDocument | null> {
    this.logger.debug(`Finding material by ID: ${id}`);
    return this.materialModel.findById(id).exec();
  }

  /**
   * Find material by material_id (business key)
   * @param materialId - Material ID (e.g., "MAT-001")
   * @returns - Material document or null
   */
  async findByMaterialId(materialId: string): Promise<MaterialDocument | null> {
    this.logger.debug(`Finding material by material_id: ${materialId}`);
    return this.materialModel.findOne({ material_id: materialId }).exec();
  }

  /**
   * Find material by part_number
   * @param partNumber - Part number
   * @returns - Material document or null
   */
  async findByPartNumber(partNumber: string): Promise<MaterialDocument | null> {
    this.logger.debug(`Finding material by part_number: ${partNumber}`);
    return this.materialModel.findOne({ part_number: partNumber }).exec();
  }

  /**
   * Search materials by multiple fields (multi-field search)
   * Searches in: material_name, material_id, part_number
   * @param query - Search query string
   * @param page - Page number (1-indexed)
   * @param limit - Records per page
   * @returns - Paginated search results
   */
  async search(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: MaterialDocument[];
    total: number;
  }> {
    this.logger.debug(`Searching materials with query: ${query}`);

    const skip = (page - 1) * limit;
    const regex = new RegExp(query, 'i'); // Case-insensitive regex

    // Search across multiple fields
    const searchQuery = {
      $or: [
        { material_name: regex },
        { material_id: regex },
        { part_number: regex },
      ],
    };

    const data = await this.materialModel
      .find(searchQuery)
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();

    const total = await this.materialModel.countDocuments(searchQuery);

    return { data, total };
  }

  async findOptions(
    query?: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Array<{
      material_id: string;
      material_name: string;
      part_number: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const mongoQuery: Record<string, unknown> = {};

    if (status) {
      mongoQuery.status = status;
    }

    if (query?.trim()) {
      const regex = new RegExp(query.trim(), 'i');
      mongoQuery.$or = [
        { material_id: regex },
        { material_name: regex },
        { part_number: regex },
      ];
    }

    const [items, total] = await Promise.all([
      this.materialModel
        .find(mongoQuery)
        .select({
          _id: 0,
          material_id: 1,
          material_name: 1,
          part_number: 1,
        })
        .sort({ material_id: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.materialModel.countDocuments(mongoQuery).exec(),
    ]);

    return {
      data: items as Array<{
        material_id: string;
        material_name: string;
        part_number: string;
      }>,
      total,
      page,
      limit,
    };
  }

  /**
   * Filter materials by material_type
   * @param materialType - Material type enum value
   * @param page - Page number (1-indexed)
   * @param limit - Records per page
   * @returns - Paginated filtered results
   */
  async filterByType(
    materialType: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: MaterialDocument[];
    total: number;
  }> {
    this.logger.debug(`Filtering materials by type: ${materialType}`);

    const skip = (page - 1) * limit;
    const filterQuery = { material_type: materialType };

    const data = await this.materialModel
      .find(filterQuery)
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();

    const total = await this.materialModel.countDocuments(filterQuery);

    return { data, total };
  }

  /**
   * Update material by ID
   * @param id - MongoDB ObjectId
   * @param updateDto - Fields to update
   * @returns - Updated material document or null
   */
  async update(
    id: string,
    updateDto: UpdateMaterialDto,
  ): Promise<MaterialDocument | null> {
    this.logger.debug(`Updating material: ${id}`);

    return this.materialModel
      .findByIdAndUpdate(id, updateDto, {
        new: true, // Return updated document
        runValidators: true, // Run schema validators on update
      })
      .exec();
  }

  /**
   * Delete material by ID (hard delete)
   * @param id - MongoDB ObjectId
   * @returns - Deleted material document or null
   */
  async delete(id: string): Promise<MaterialDocument | null> {
    this.logger.debug(`Deleting material: ${id}`);
    return this.materialModel.findByIdAndDelete(id).exec();
  }

  /**
   * Check if a value already exists for a specific field (for duplicate detection)
   * @param field - Field name to check (material_id, part_number)
   * @param value - Value to search for
   * @param excludeId - Optional MongoDB ID to exclude from check (for updates)
   * @returns - true if duplicate exists, false otherwise
   */
  async isDuplicate(
    field: 'material_id' | 'part_number',
    value: string,
    excludeId?: string,
  ): Promise<boolean> {
    this.logger.debug(
      `Checking duplicate for ${field}: ${value}${excludeId ? ` (excluding ${excludeId})` : ''}`,
    );

    const query: any = { [field]: value };

    // Exclude current document during update
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const count = await this.materialModel.countDocuments(query);
    return count > 0;
  }

  /**
   * Get document count
   * @returns - Total number of materials in database
   */
  async count(): Promise<number> {
    this.logger.debug('Counting total materials');
    return this.materialModel.countDocuments();
  }

  /**
   * Get list of unique material types
   * @returns - Array of unique material types
   */
  async getDistinctTypes(): Promise<string[]> {
    this.logger.debug('Fetching distinct material types');
    return this.materialModel.distinct('material_type').exec();
  }
}
