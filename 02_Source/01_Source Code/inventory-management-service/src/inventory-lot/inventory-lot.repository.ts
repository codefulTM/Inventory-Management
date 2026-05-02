/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../schemas/inventory-lot.schema';
import type {
  CreateInventoryLotDto,
  UpdateInventoryLotDto,
} from './inventory-lot.dto';

/**
 * InventoryLotRepository - Lớp thao tác trực tiếp với MongoDB
 * 
 * Chức năng chính:
 * - Thực hiện các truy vấn CRUD với collection "inventory_lots"
 * - Hỗ trợ phân trang, tìm kiếm, lọc theo nhiều tiêu chí
 * - Quản lý tìm kiếm theo ngày (hết hạn, sắp hết hạn)
 * - Hỗ trợ aggregate queries cho thống kê
 * - Quản lý cập nhật hàng loạt (updateMany)
 */
@Injectable()
export class InventoryLotRepository {
  constructor(
    @InjectModel(InventoryLot.name)
    private inventoryLotModel: Model<InventoryLotDocument>,
  ) {}

  /**
   * Tạo mới một lô hàng trong database
   * @param createDto - Dữ liệu tạo lô hàng
   * @returns InventoryLotDocument - Document lô hàng đã lưu
   */
  async create(
    createDto: CreateInventoryLotDto,
  ): Promise<InventoryLotDocument> {
    // Dynamic import để tránh Jest issues với uuid ESM module
    const newLot = new this.inventoryLotModel({
      ...createDto,
    });
    return newLot.save();
  }

  /**
   * Lấy tất cả lô hàng có phân trang
   * Sắp xếp theo created_date giảm dần
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: InventoryLotDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const data = await this.inventoryLotModel
      .find()
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();
    const total = await this.inventoryLotModel.countDocuments().exec();
    return { data, total };
  }

  /**
   * Tìm lô hàng theo lot_id
   * @param lot_id - Business ID (LOT-XXX)
   * @returns InventoryLotDocument hoặc null
   */
  async findById(lot_id: string): Promise<InventoryLotDocument | null> {
    return this.inventoryLotModel.findOne({ lot_id }).exec();
  }

  /**
   * Tìm lô hàng theo material_id (tất cả lô của một vật tư)
   */
  async findByMaterialId(
    material_id: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: InventoryLotDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const data = await this.inventoryLotModel
      .find({ material_id })
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();
    const total = await this.inventoryLotModel
      .countDocuments({ material_id })
      .exec();
    return { data, total };
  }

  /**
   * Tìm lô hàng theo trạng thái
   */
  async findByStatus(
    status: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: InventoryLotDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const data = await this.inventoryLotModel
      .find({ status })
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();
    const total = await this.inventoryLotModel
      .countDocuments({ status })
      .exec();
    return { data, total };
  }

  /**
   * Tìm lô hàng theo is_sample flag
   */
  async findBySampleStatus(
    is_sample: boolean,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: InventoryLotDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const data = await this.inventoryLotModel
      .find({ is_sample })
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();
    const total = await this.inventoryLotModel
      .countDocuments({ is_sample })
      .exec();
    return { data, total };
  }

  /**
   * Tìm các lô mẫu của một lô cha
   * @param parent_lot_id - ID lô cha
   * @returns Danh sách lô mẫu
   */
  async findSamplesByParentLot(
    parent_lot_id: string,
  ): Promise<InventoryLotDocument[]> {
    return this.inventoryLotModel
      .find({ parent_lot_id, is_sample: true })
      .sort({ created_date: -1 })
      .exec();
  }

  /**
   * Tìm kiếm lô hàng theo từ khóa
   * Tìm trong: manufacturer_name, manufacturer_lot, supplier_name, lot_id
   */
  async search(
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: InventoryLotDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const regex = new RegExp(query, 'i');
    const data = await this.inventoryLotModel
      .find({
        $or: [
          { manufacturer_name: regex },
          { manufacturer_lot: regex },
          { supplier_name: regex },
          { lot_id: regex },
        ],
      })
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();
    const total = await this.inventoryLotModel
      .countDocuments({
        $or: [
          { manufacturer_name: regex },
          { manufacturer_lot: regex },
          { supplier_name: regex },
        ],
      })
      .exec();
    return { data, total };
  }

  /**
   * Lọc lô hàng theo nhiều tiêu chí
   * @param filter - Các tiêu chí lọc
   */
  async findByFilter(
    filter: {
      material_id?: string;
      status?: string;
      is_sample?: boolean;
      manufacturer_name?: string;
    },
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: InventoryLotDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filter.material_id) query.material_id = filter.material_id;
    if (filter.status) query.status = filter.status;
    if (filter.is_sample !== undefined) query.is_sample = filter.is_sample;
    if (filter.manufacturer_name)
      query.manufacturer_name = new RegExp(filter.manufacturer_name, 'i');

    const data = await this.inventoryLotModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ created_date: -1 })
      .exec();
    const total = await this.inventoryLotModel.countDocuments(query).exec();
    return { data, total };
  }

  /**
   * Lấy danh sách lô hàng dạng options (cho dropdown)
   */
  async findOptions(
    options: {
      q?: string;
      material_id?: string;
      status?: string;
      exclude_statuses?: string[];
      warehouse_id?: string;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: InventoryLotDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (options.material_id) {
      query.material_id = options.material_id;
    }

    if (options.status) {
      query.status = options.status;
    }

    if (options.exclude_statuses && options.exclude_statuses.length > 0) {
      query.status = {
        $nin: options.exclude_statuses,
      };
    }

    if (options.warehouse_id) {
      query.warehouse_id = options.warehouse_id;
    }

    if (options.q?.trim()) {
      const regex = new RegExp(options.q.trim(), 'i');
      query.$or = [
        { lot_id: regex },
        { material_id: regex },
        { manufacturer_lot: regex },
      ];
    }

    const data = await this.inventoryLotModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ lot_id: 1 })
      .exec();
    const total = await this.inventoryLotModel.countDocuments(query).exec();
    return { data, total };
  }

  /**
   * Cập nhật lô hàng theo lot_id
   */
  async update(
    lot_id: string,
    updateDto: Partial<UpdateInventoryLotDto>,
  ): Promise<InventoryLotDocument | null> {
    return this.inventoryLotModel
      .findOneAndUpdate({ lot_id }, updateDto, { new: true })
      .exec();
  }

  /**
   * Cập nhật trạng thái theo lot_id
   */
  async updateStatus(
    lot_id: string,
    status: string,
  ): Promise<InventoryLotDocument | null> {
    return this.inventoryLotModel
      .findOneAndUpdate({ lot_id }, { status }, { new: true })
      .exec();
  }

  /**
   * Cập nhật số lượng theo lot_id (tăng/giảm)
   * @param quantityDelta - Lượng thay đổi (dương: tăng, âm: giảm)
   */
  async updateQuantity(
    lot_id: string,
    quantityDelta: number | string,
  ): Promise<InventoryLotDocument | null> {
    const delta = Number(quantityDelta) || 0;
    return this.inventoryLotModel
      .findOneAndUpdate(
        { lot_id },
        { $inc: { quantity: delta } },
        { new: true },
      )
      .exec();
  }

  /**
   * Xóa lô hàng theo lot_id
   */
  async delete(lot_id: string): Promise<InventoryLotDocument | null> {
    return this.inventoryLotModel.findOneAndDelete({ lot_id }).exec();
  }

  /**
   * Lấy lô hàng theo material_id và status
   * Sắp xếp theo received_date tăng dần (FIFO)
   */
  async getLotsByMaterialAndStatus(
    material_id: string,
    status: string,
  ): Promise<InventoryLotDocument[]> {
    return this.inventoryLotModel
      .find({ material_id, status })
      .sort({ received_date: 1 })
      .exec();
  }

  /**
   * Đếm số lô theo trạng thái
   */
  async countByStatus(status: string): Promise<number> {
    return this.inventoryLotModel.countDocuments({ status }).exec();
  }

  /**
   * Kiểm tra lô có tồn tại theo lot_id
   */
  async checkLotExists(lot_id: string): Promise<boolean> {
    const lot = await this.inventoryLotModel.findOne({ lot_id }).exec();
    return !!lot;
  }

  /**
   * Tìm các lô sắp hết hạn (trong vòng X ngày)
   */
  async findExpiringSoon(days: number = 30): Promise<InventoryLotDocument[]> {
    const currentDate = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.inventoryLotModel
      .find({
        expiration_date: {
          $gte: currentDate,
          $lte: futureDate,
        },
        status: { $ne: 'Depleted' },
      })
      .sort({ expiration_date: 1 })
      .exec();
  }

  /**
   * Tìm các lô đã hết hạn
   */
  async findExpiredLots(): Promise<InventoryLotDocument[]> {
    const currentDate = new Date();
    return this.inventoryLotModel
      .find({
        expiration_date: { $lt: currentDate },
        status: { $ne: 'Depleted' },
      })
      .sort({ expiration_date: 1 })
      .exec();
  }

  /**
   * Tìm lô hàng theo danh sách lot_id
   */
  async findByLotIds(lot_ids: string[]): Promise<InventoryLotDocument[]> {
    return this.inventoryLotModel
      .find({ lot_id: { $in: lot_ids } })
      .sort({ created_date: -1 })
      .exec();
  }

  /**
   * Aggregate query - hỗ trợ các truy vấn phức tạp
   */
  async aggregate<T = any>(pipeline: any[]): Promise<T[]> {
    return this.inventoryLotModel.aggregate<T>(pipeline).exec();
  }

  /**
   * Cập nhật hàng loạt theo danh sách lot_id
   */
  async updateStatusByIds(
    lot_ids: string[],
    status: string,
  ): Promise<{ modifiedCount: number }> {
    const result = await this.inventoryLotModel
      .updateMany({ lot_id: { $in: lot_ids } }, { $set: { status } })
      .exec();
    return { modifiedCount: result.modifiedCount };
  }
}
