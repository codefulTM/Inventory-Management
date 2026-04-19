/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Warehouse, WarehouseDocument } from '../schemas/warehouse.schema';

@Injectable()
export class WarehouseRepository {
  private readonly logger = new Logger(WarehouseRepository.name);

  constructor(
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
  ) {}

  async create(createDto: any): Promise<WarehouseDocument> {
    this.logger.debug(`Creating warehouse: ${createDto.warehouse_id}`);
    const doc = new this.warehouseModel(createDto);
    return doc.save();
  }

  async findAllWithoutPagination(): Promise<WarehouseDocument[]> {
    return this.warehouseModel.find().exec();
  }

  async findAllWithPagination(
    page = 1,
    limit = 20,
  ): Promise<{
    data: WarehouseDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const data = await this.warehouseModel
      .find()
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();
    const total = await this.warehouseModel.countDocuments().exec();
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<WarehouseDocument | null> {
    return this.warehouseModel.findById(id).exec();
  }

  async findByWarehouseId(
    warehouseId: string,
  ): Promise<WarehouseDocument | null> {
    this.logger.debug(`Finding by warehouse_id: ${warehouseId}`);
    return this.warehouseModel.findOne({ warehouse_id: warehouseId }).exec();
  }

  async search(
    query: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: WarehouseDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const regex = new RegExp(query, 'i');
    const searchQuery = {
      $or: [{ warehouse_name: regex }, { warehouse_id: regex }],
    };
    const data = await this.warehouseModel
      .find(searchQuery)
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();
    const total = await this.warehouseModel.countDocuments(searchQuery).exec();
    return { data, total };
  }

  async update(id: string, updateDto: any): Promise<WarehouseDocument | null> {
    return this.warehouseModel
      .findByIdAndUpdate(id, updateDto, { new: true, runValidators: true })
      .exec();
  }

  async delete(id: string): Promise<WarehouseDocument | null> {
    return this.warehouseModel.findByIdAndDelete(id).exec();
  }

  async isDuplicate(
    field: 'warehouse_id' | 'warehouse_name',
    value: string,
    excludeId?: string,
  ): Promise<boolean> {
    const query: any = { [field]: value };
    if (excludeId) query._id = { $ne: excludeId };
    const count = await this.warehouseModel.countDocuments(query).exec();
    return count > 0;
  }

  async count(): Promise<number> {
    return this.warehouseModel.countDocuments().exec();
  }

  async findOptions(query?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const mongoQuery: Record<string, unknown> = {};
    if (query?.trim()) {
      const regex = new RegExp(query.trim(), 'i');
      mongoQuery.$or = [{ warehouse_id: regex }, { warehouse_name: regex }];
    }

    const [items, total] = await Promise.all([
      this.warehouseModel
        .find(mongoQuery)
        .select({ _id: 0, warehouse_id: 1, warehouse_name: 1 })
        .sort({ warehouse_id: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.warehouseModel.countDocuments(mongoQuery).exec(),
    ]);

    return { data: items as any[], total, page, limit };
  }
}
