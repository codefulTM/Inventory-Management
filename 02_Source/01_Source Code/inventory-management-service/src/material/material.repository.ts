/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * MaterialRepository - Lớp thao tác trực tiếp với cơ sở dữ liệu MongoDB
 * 
 * Chức năng chính:
 * - Thực hiện các truy vấn CRUD với collection "materials"
 * - Hỗ trợ phân trang (pagination), tìm kiếm, lọc dữ liệu
 * - Sử dụng Mongoose Model để tương tác với MongoDB
 * - Cung cấp các phương thức tìm kiếm theo nhiều tiêu chí khác nhau
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Material, MaterialDocument } from '../schemas/material.schema';
import { CreateMaterialDto, UpdateMaterialDto } from './material.dto';

@Injectable()
export class MaterialRepository {
  private readonly logger = new Logger(MaterialRepository.name);

  constructor(
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
  ) {}

  /**
   * Tạo mới một vật tư trong database
   * @param createDto - Dữ liệu tạo vật tư
   * @returns MaterialDocument - Document vật tư đã được lưu
   */
  async create(createDto: CreateMaterialDto): Promise<MaterialDocument> {
    this.logger.debug(`Creating material: ${createDto.material_id}`);
    const newMaterial = new this.materialModel(createDto);
    return newMaterial.save();
  }

  /**
   * Lấy tất cả vật tư (không phân trang)
   * @returns Danh sách tất cả MaterialDocument
   */
  async findAllWithoutPagination(): Promise<MaterialDocument[]> {
    return this.materialModel.find().exec();
  }

  /**
   * Lấy danh sách vật tư có phân trang
   * Sắp xếp theo created_date giảm dần (mới nhất trước)
   * 
   * @param page - Số trang (bắt đầu từ 1)
   * @param limit - Số bản ghi mỗi trang
   * @returns Object chứa data và metadata phân trang
   */
  async findAllWithPagination(
    page: number =1,
    limit: number =20,
  ): Promise<{
    data: MaterialDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.debug(`Finding materials - page: ${page}, limit: ${limit}`);

    const skip = (page -1) * limit;
    const data = await this.materialModel
      .find()
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 }) // Sắp xếp mới nhất trước
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
   * Tìm vật tư theo MongoDB _id
   * @param id - MongoDB ObjectId
   * @returns MaterialDocument hoặc null nếu không tìm thấy
   */
  async findById(id: string): Promise<MaterialDocument | null> {
    this.logger.debug(`Finding material by ID: ${id}`);
    return this.materialModel.findById(id).exec();
  }

  /**
   * Tìm vật tư theo material_id (business key)
   * Ví dụ: "MAT-001", "MAT-002"
   * 
   * @param materialId - Material ID (business key)
   * @returns MaterialDocument hoặc null nếu không tìm thấy
   */
  async findByMaterialId(materialId: string): Promise<MaterialDocument | null> {
    this.logger.debug(`Finding material by material_id: ${materialId}`);
    return this.materialModel.findOne({ material_id: materialId }).exec();
  }

  /**
   * Tìm nhiều vật tư theo danh sách material_id
   * Sử dụng toán tử $in của MongoDB
   * 
   * @param materialIds - Danh sách material_id cần tìm
   * @returns Danh sách MaterialDocument (lean - plain JavaScript objects)
   */
  async findByMaterialIds(materialIds: string[]): Promise<MaterialDocument[]> {
    if (!materialIds || materialIds.length === 0) return [];
    return this.materialModel.find({ material_id: { $in: materialIds } }).lean().exec();
  }

  /**
   * Tìm vật tư theo part_number
   * part_number là duy nhất trong hệ thống
   * 
   * @param partNumber - Part number cần tìm
   * @returns MaterialDocument hoặc null nếu không tìm thấy
   */
  async findByPartNumber(partNumber: string): Promise<MaterialDocument | null> {
    this.logger.debug(`Finding material by part_number: ${partNumber}`);
    return this.materialModel.findOne({ part_number: partNumber }).exec();
  }

  /**
   * Tìm kiếm vật tư theo từ khóa (multi-field search)
   * Tìm trong: material_name, material_id, part_number
   * Sử dụng regex case-insensitive
   * 
   * @param query - Từ khóa tìm kiếm
   * @param page - Số trang
   * @param limit - Số bản ghi mỗi trang
   * @returns Object chứa data và total
   */
  async search(
    query: string,
    page: number =1,
    limit: number =20,
  ): Promise<{
    data: MaterialDocument[];
    total: number;
  }> {
    this.logger.debug(`Searching materials with query: ${query}`);

    const skip = (page -1) * limit;
    const regex = new RegExp(query, 'i'); // Case-insensitive regex
    
    // Tìm kiếm trên nhiều trường
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

  /**
   * Lấy danh sách vật tư dạng options (cho dropdown/select)
   * Chỉ trả về các trường cần thiết: material_id, material_name, part_number
   * 
   * @param query - Từ khóa tìm kiếm (tùy chọn)
   * @param status - Lọc theo trạng thái (tùy chọn)
   * @param page - Số trang
   * @param limit - Số bản ghi mỗi trang
   * @returns Object chứa data và metadata phân trang
   */
  async findOptions(
    query?: string,
    status?: string,
    page: number =1,
    limit: number =20,
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
    const skip = (page -1) * limit;
    const mongoQuery: Record<string, unknown> = {};

    // Lọc theo trạng thái nếu có
    if (status) {
      mongoQuery.status = status;
    }

    // Tìm kiếm theo từ khóa nếu có
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
   * Lọc vật tư theo loại (material_type)
   * 
   * @param materialType - Loại vật tư (API, Excipient, etc.)
   * @param page - Số trang
   * @param limit - Số bản ghi mỗi trang
   * @returns Object chứa data và total
   */
  async filterByType(
    materialType: string,
    page: number =1,
    limit: number =20,
  ): Promise<{
    data: MaterialDocument[];
    total: number;
  }> {
    this.logger.debug(`Filtering materials by type: ${materialType}`);

    const skip = (page -1) * limit;
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
   * Cập nhật vật tư theo ID
   * Sử dụng findByIdAndUpdate với tùy chọn trả về document mới
   * 
   * @param id - MongoDB ObjectId
   * @param updateDto - Dữ liệu cập nhật
   * @returns MaterialDocument đã cập nhật hoặc null
   */
  async update(
    id: string,
    updateDto: UpdateMaterialDto,
  ): Promise<MaterialDocument | null> {
    this.logger.debug(`Updating material: ${id}`);

    return this.materialModel
      .findByIdAndUpdate(id, updateDto, {
        new: true, // Trả về document sau khi cập nhật
        runValidators: true, // Chạy schema validators khi cập nhật
      })
      .exec();
  }

  /**
   * Xóa vật tư theo ID (hard delete)
   * @param id - MongoDB ObjectId
   * @returns MaterialDocument đã xóa hoặc null
   */
  async delete(id: string): Promise<MaterialDocument | null> {
    this.logger.debug(`Deleting material: ${id}`);
    return this.materialModel.findByIdAndDelete(id).exec();
  }

  /**
   * Kiểm tra trùng lặp cho một trường cụ thể
   * Dùng cho validate uniqueness (material_id, part_number)
   * 
   * @param field - Tên trường cần kiểm tra ('material_id' hoặc 'part_number')
   * @param value - Giá trị cần kiểm tra
   * @param excludeId - Optional: MongoDB ID loại trừ (dùng khi update)
   * @returns true nếu đã tồn tại, false nếu chưa
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

    // Loại trừ document hiện tại khi đang update
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const count = await this.materialModel.countDocuments(query);
    return count > 0;
  }

  /**
   * Đếm tổng số vật tư trong database
   * @returns Tổng số vật tư
   */
  async count(): Promise<number> {
    this.logger.debug('Counting total materials');
    return this.materialModel.countDocuments();
  }

  /**
   * Lấy danh sách các loại vật tư duy nhất
   * Sử dụng distinct() của MongoDB
   * 
   * @returns Array các loại vật tư không trùng lặp
   */
  async getDistinctTypes(): Promise<string[]> {
    this.logger.debug('Fetching distinct material types');
    return this.materialModel.distinct('material_type').exec();
  }
}
