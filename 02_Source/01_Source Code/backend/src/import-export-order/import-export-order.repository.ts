import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ImportExportOrderAttachment,
  ImportExportOrder,
  ImportExportOrderDocument,
} from '../schemas/import-export-order.schema';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../schemas/inventory-lot.schema';
import { Material, MaterialDocument } from '../schemas/material.schema';

export interface ImportExportOrderFilterOptions {
  status?: string;
  order_type?: string;
  created_by?: string;
  from?: Date;
  to?: Date;
}

export interface ImportExportOrderPaginationOptions {
  page?: number;
  limit?: number;
}

interface ImportExportOrderMongoQuery {
  status?: string;
  order_type?: string;
  created_by?: string;
  created_date?: {
    $gte?: Date;
    $lte?: Date;
  };
}

@Injectable()
export class ImportExportOrderRepository {
  constructor(
    @InjectModel(ImportExportOrder.name)
    private readonly model: Model<ImportExportOrderDocument>,
    @InjectModel(InventoryLot.name)
    private readonly inventoryLotModel: Model<InventoryLotDocument>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
  ) {}

  async create(dto: Partial<ImportExportOrder>) {
    const doc = new this.model(dto);
    return doc.save();
  }

  async findAll(
    filters: ImportExportOrderFilterOptions = {},
    pagination: ImportExportOrderPaginationOptions = { page: 1, limit: 20 },
  ) {
    const mongoQuery: ImportExportOrderMongoQuery = {};

    if (filters.status) {
      mongoQuery.status = filters.status;
    }

    if (filters.order_type) {
      mongoQuery.order_type = filters.order_type;
    }

    if (filters.created_by) {
      mongoQuery.created_by = filters.created_by;
    }

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

  async findOneByOrderId(orderId: string) {
    return this.model.findOne({ order_id: orderId }).exec();
  }

  async updateByOrderId(orderId: string, dto: Partial<ImportExportOrder>) {
    return this.model
      .findOneAndUpdate({ order_id: orderId }, dto, { new: true })
      .exec();
  }

  async appendAttachment(
    orderId: string,
    attachment: ImportExportOrderAttachment,
  ) {
    return this.model
      .findOneAndUpdate(
        { order_id: orderId },
        { $push: { attachments: attachment } },
        { new: true },
      )
      .exec();
  }

  async findLotByLotId(scanCode: string) {
    return this.inventoryLotModel.findOne({ lot_id: scanCode }).exec();
  }

  async findLotByManufacturerLot(scanCode: string) {
    return this.inventoryLotModel
      .findOne({ manufacturer_lot: scanCode })
      .exec();
  }

  async findMaterialByMaterialId(scanCode: string) {
    return this.materialModel.findOne({ material_id: scanCode }).exec();
  }

  async findMaterialByPartNumber(scanCode: string) {
    return this.materialModel.findOne({ part_number: scanCode }).exec();
  }
}
