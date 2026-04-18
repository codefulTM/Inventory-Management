/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeleteResult } from 'mongodb';
import {
  InventoryTransaction,
  InventoryTransactionDocument,
} from '../schemas/inventory-transaction.schema';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface FilterOptions {
  lot_id?: string;
  transaction_type?: string;
  search?: string;
  from?: Date;
  to?: Date;
}

export interface MyHistoryFilterOptions {
  transaction_type?: string;
  from?: Date;
  to?: Date;
  keyword?: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class InventoryTransactionRepository {
  constructor(
    @InjectModel(InventoryTransaction.name)
    private readonly model: Model<InventoryTransactionDocument>,
  ) {}
  async findAll(
    filters: FilterOptions = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ) {
    // Dùng thuần Mongo query object
    const mongoQuery: any = {};

    if (filters.lot_id) {
      mongoQuery.lot_id = filters.lot_id;
    }
    if (filters.transaction_type) {
      mongoQuery.transaction_type = filters.transaction_type;
    }
    if (filters.search) {
      mongoQuery.$or = [
        { transaction_id: { $regex: filters.search, $options: 'i' } },
        { performed_by: { $regex: filters.search, $options: 'i' } },
      ];
    }

    if (filters.from || filters.to) {
      mongoQuery.transaction_date = {} as any;
      if (filters.from) mongoQuery.transaction_date.$gte = filters.from;
      if (filters.to) mongoQuery.transaction_date.$lte = filters.to;
    }

    // pagination
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
      // count filtered documents without pagination
      this.model.countDocuments(mongoQuery).exec(),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    return this.model.findById(id).exec();
  }

  async findMyHistory(
    actor: string,
    filters: MyHistoryFilterOptions = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ) {
    const mongoQuery: any = {
      performed_by: actor,
    };

    if (filters.transaction_type) {
      mongoQuery.transaction_type = filters.transaction_type;
    }

    if (filters.from || filters.to) {
      mongoQuery.transaction_date = {} as any;
      if (filters.from) mongoQuery.transaction_date.$gte = filters.from;
      if (filters.to) mongoQuery.transaction_date.$lte = filters.to;
    }

    const keyword = filters.keyword?.trim();

    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const limit =
      pagination.limit && pagination.limit > 0 ? pagination.limit : 20;
    const skip = (page - 1) * limit;

    if (keyword) {
      const keywordRegex = new RegExp(escapeRegex(keyword), 'i');

      const pipeline = [
        { $match: mongoQuery },
        {
          $lookup: {
            from: 'inventory_lots',
            localField: 'lot_id',
            foreignField: 'lot_id',
            as: 'lot_docs',
          },
        },
        {
          $addFields: {
            material_id: {
              $ifNull: [{ $arrayElemAt: ['$lot_docs.material_id', 0] }, null],
            },
          },
        },
        {
          $match: {
            $or: [
              { transaction_id: keywordRegex },
              { reference_number: keywordRegex },
              { lot_id: keywordRegex },
              { material_id: keywordRegex },
            ],
          },
        },
      ];

      const [items, totalCountRows] = await Promise.all([
        this.model
          .aggregate([
            ...pipeline,
            { $sort: { transaction_date: -1 } },
            { $skip: skip },
            { $limit: limit },
          ])
          .exec(),
        this.model
          .aggregate([...pipeline, { $count: 'total' }])
          .exec() as Promise<Array<{ total: number }>>,
      ]);

      return {
        items,
        total: totalCountRows[0]?.total ?? 0,
      };
    }

    const [items, total] = await Promise.all([
      this.model
        .find(mongoQuery)
        .sort({ transaction_date: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(mongoQuery).exec(),
    ]);

    return { items, total };
  }

  async findOneByTransactionIdAndActor(transactionId: string, actor: string) {
    return this.model
      .findOne({
        transaction_id: transactionId,
        performed_by: actor,
      })
      .exec();
  }

  async findOneByTransactionId(transactionId: string) {
    return this.model
      .findOne({
        transaction_id: transactionId,
      })
      .exec();
  }

  async create(dto: any) {
    const doc = new this.model(dto);
    return doc.save();
  }

  async createMany(dtos: any[]) {
    return this.model.insertMany(dtos);
  }

  async update(id: string, dto: any) {
    return this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async remove(id: string) {
    return this.model.findByIdAndDelete(id).exec();
  }

  async deleteByLotId(lot_id: string): Promise<DeleteResult> {
    return this.model.deleteMany({ lot_id }).exec();
  }
}
