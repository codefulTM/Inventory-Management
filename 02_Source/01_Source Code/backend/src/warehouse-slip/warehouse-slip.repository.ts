import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WarehouseSlip,
  WarehouseSlipDocument,
} from '../schemas/warehouse-slip.schema';
import { Warehouse, WarehouseDocument } from '../schemas/warehouse.schema';
import { MaterialRepository } from '../material/material.repository';

export interface WarehouseSlipFilterOptions {
  status?: string;
  created_by?: string;
  from?: Date;
  to?: Date;
  warehouse_id?: string;
}

export interface WarehouseSlipPaginationOptions {
  page?: number;
  limit?: number;
}

@Injectable()
export class WarehouseSlipRepository {
  private readonly logger = new Logger(WarehouseSlipRepository.name);

  constructor(
    @InjectModel(WarehouseSlip.name)
    private readonly model: Model<WarehouseSlipDocument>,
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
    private readonly materialRepository: MaterialRepository,
  ) {}

  async findMaterialById(materialId: string) {
    // Delegate to MaterialRepository for encapsulation
    return this.materialRepository.findByMaterialId(materialId);
  }

  async create(dto: Partial<WarehouseSlip>) {
    const doc = new this.model(dto);
    return doc.save();
  }

  async findAll(
    filters: WarehouseSlipFilterOptions = {},
    pagination: WarehouseSlipPaginationOptions = { page: 1, limit: 20 },
  ) {
    const mongoQuery: any = {};

    if (filters.status) mongoQuery.status = filters.status;
    if (filters.created_by) mongoQuery.created_by = filters.created_by;
    if (filters.warehouse_id) mongoQuery.warehouse_id = filters.warehouse_id;

    if (filters.from || filters.to) {
      mongoQuery.created_date = {};
      if (filters.from) mongoQuery.created_date.$gte = filters.from;
      if (filters.to) mongoQuery.created_date.$lte = filters.to;
    }

    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const limit =
      pagination.limit && pagination.limit > 0 ? pagination.limit : 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model
        .find(mongoQuery)
        .sort({ created_date: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(mongoQuery).exec(),
    ]);

    return { items, total, page, limit };
  }

  async findOneBySlipId(slipId: string) {
    return this.model.findOne({ slip_id: slipId }).exec();
  }

  async updateBySlipId(slipId: string, dto: Partial<WarehouseSlip>) {
    return this.model
      .findOneAndUpdate({ slip_id: slipId }, dto, { new: true })
      .exec();
  }

  async appendAttachment(slipId: string, attachment: any) {
    return this.model
      .findOneAndUpdate(
        { slip_id: slipId },
        { $push: { attachments: attachment } },
        { new: true },
      )
      .exec();
  }

  async findWarehouseById(warehouseId: string) {
    return this.warehouseModel
      .findOne({ warehouse_id: warehouseId })
      .lean()
      .exec();
  }
}
