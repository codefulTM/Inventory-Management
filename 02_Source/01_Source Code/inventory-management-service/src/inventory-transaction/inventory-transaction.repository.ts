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

/**
 * FilterOptions - Các tùy chọn lọc giao dịch
 */
export interface FilterOptions {
  lot_id?: string; // Lọc theo lô hàng
  transaction_type?: string; // Lọc theo loại giao dịch
  search?: string; // Tìm kiếm theo transaction_id, performed_by
  from?: Date; // Từ ngày (transaction_date)
  to?: Date; // Đến ngày (transaction_date)
}

/**
 * PaginationOptions - Tùy chọn phân trang
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * MyHistoryFilterOptions - Các tùy chọn lọc lịch sử giao dịch cá nhân
 */
export interface MyHistoryFilterOptions {
  transaction_type?: string;
  from?: Date;
  to?: Date;
  keyword?: string; // Từ khóa tìm kiếm nâng cao (dùng aggregate)
}

/**
 * Escape regex special characters để tránh ReDoS attacks
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * InventoryTransactionRepository - Lớp thao tác với MongoDB
 * 
 * Chức năng chính:
 * - Thực hiện CRUD với collection "inventory_transactions"
 * - Hỗ trợ phân trang, lọc theo nhiều tiêu chí
 * - Tìm kiếm theo transaction_id (không dùng _id)
 * - Lấy lịch sử giao dịch theo người thực hiện (performed_by)
 * - Hỗ trợ aggregate queries cho tìm kiếm nâng cao (kết hợp với inventory_lots)
 * - Xóa hàng loạt theo lot_id
 */
@Injectable()
export class InventoryTransactionRepository {
  constructor(
    @InjectModel(InventoryTransaction.name)
    private readonly model: Model<InventoryTransactionDocument>,
  ) {}

  /**
   * Lấy danh sách giao dịch có phân trang và lọc
   * Sắp xếp theo transaction_date giảm dần
   */
  async findAll(
    filters: FilterOptions = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
  ) {
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
      // Đếm số bản ghi đã lọc (không phân trang)
      this.model.countDocuments(mongoQuery).exec(),
    ]);

    return { items, total };
  }

  /**
   * Tìm giao dịch theo transaction_id (Ví dụ: "TXN-023")
   * Repository KHÔNG thao tác với MongoDB _id
   */
  async findOne(transactionId: string) {
    if (!transactionId) return null;
    return this.model.findOne({ transaction_id: transactionId }).exec();
  }

  /**
   * Lấy lịch sử giao dịch của một người dùng (performed_by)
   * Hỗ trợ tìm kiếm nâng cao bằng aggregate khi có keyword
   */
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

    // Nếu có keyword → dùng aggregate để tìm kiếm cả material_id (thông qua lot_id)
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

    // Không có keyword → truy vấn thông thường
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

  /**
   * Tìm giao dịch theo transaction_id và actor (performed_by)
   * Dùng để kiểm tra quyền xem lịch sử cá nhân
   */
  async findOneByTransactionIdAndActor(transactionId: string, actor: string) {
    return this.model
      .findOne({
        transaction_id: transactionId,
        performed_by: actor,
      })
      .exec();
  }

  /**
   * Tìm theo transaction_id (không cần actor)
   */
  async findOneByTransactionId(transactionId: string) {
    return this.model
      .findOne({
        transaction_id: transactionId,
      })
      .exec();
  }

  /**
   * Tạo mới một giao dịch
   */
  async create(dto: any) {
    const doc = new this.model(dto);
    return doc.save();
  }

  /**
   * Tạo hàng loạt giao dịch
   */
  async createMany(dtos: any[]) {
    return this.model.insertMany(dtos);
  }

  /**
   * Cập nhật theo transaction_id (không dùng _id)
   */
  async update(transactionId: string, dto: any) {
    if (!transactionId) return null;
    return this.model
      .findOneAndUpdate({ transaction_id: transactionId }, dto, { new: true })
      .exec();
  }

  /**
   * Xóa theo transaction_id (không dùng _id)
   */
  async remove(transactionId: string) {
    if (!transactionId) return null;
    return this.model
      .findOneAndDelete({ transaction_id: transactionId })
      .exec();
  }

  /**
   * Xóa tất cả giao dịch theo lot_id
   */
  async deleteByLotId(lot_id: string): Promise<DeleteResult> {
    return this.model.deleteMany({ lot_id }).exec();
  }

  /**
   * Chạy aggregate pipeline trực tiếp
   * Dùng cho các báo cáo/thống kê phức tạp
   */
  async aggregate<T = any>(pipeline: any[]): Promise<T[]> {
    return this.model.aggregate<T>(pipeline).exec();
  }
}
