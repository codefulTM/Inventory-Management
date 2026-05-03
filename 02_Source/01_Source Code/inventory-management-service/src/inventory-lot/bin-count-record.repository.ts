import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BinCountRecord,
  BinCountRecordDocument,
} from '../schemas/bin-count-record.schema';

/**
 * Repository quản lý việc ghi nhận kết quả đếm tồn kho tại bin (vị trí lưu kho)
 * 
 * Chức năng:
 * - Lưu trữ lịch sử các lần đếm tồn kho tại từng bin
 * - Theo dõi ai đếm, khi nào đếm, kết quả ra sao
 * - Hỗ trợ aggregate queries để thống kê
 * 
 * Bin (còn gọi là storage location/bin/rack) là vị trí lưu kho cụ thể
 * Mỗi bin có thể chứa nhiều lô hàng (lots) của nhiều vật tư khác nhau
 */
@Injectable()
export class BinCountRecordRepository {
  constructor(
    // Model lưu trữ bản ghi đếm tồn kho tại bin
    @InjectModel(BinCountRecord.name)
    private binCountModel: Model<BinCountRecordDocument>,
  ) {}

  /**
   * Tạo mới một bản ghi đếm tồn kho tại bin
   * @param data - Dữ liệu bản ghi (bin_code, counted_by, entries, ...)
   * @returns Bản ghi vừa được lưu vào DB
   */
  async create(data: Partial<BinCountRecordDocument>) {
    const rec = new this.binCountModel(data);
    return rec.save();
  }

  /**
   * Tìm bản ghi theo ID (MongoDB _id)
   * @param id - MongoDB ObjectId
   * @returns Bản ghi hoặc null
   */
  async findById(id: string) {
    return this.binCountModel.findById(id).exec();
  }

  /**
   * Lấy lịch sử đếm tồn kho của một bin cụ thể (có phân trang)
   * Sắp xếp theo thời gian đếm mới nhất trước
   * 
   * @param bin_code - Mã bin (location_id)
   * @param page - Số trang (mặc định: 1)
   * @param limit - Số bản ghi/trang (mặc định: 50)
   * @returns Object chứa danh sách data và tổng số bản ghi total
   */
  async findByBin(bin_code: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const query = { bin_code };
    const data = await this.binCountModel
      .find(query)
      .sort({ counted_at: -1 }) // Mới nhất trước
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.binCountModel.countDocuments(query).exec();
    return { data, total };
  }

  /**
   * Thực hiện aggregate query (truy vấn phức tạp với pipeline)
   * @param pipeline - Mảng các stage trong MongoDB aggregation pipeline
   * @returns Kết quả aggregate
   */
  async aggregate(pipeline: any[]) {
    return this.binCountModel.aggregate(pipeline).exec();
  }
}
