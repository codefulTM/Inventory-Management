import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

/**
 * Interface định nghĩa cấu trúc của một bản ghi log ứng dụng
 */
export interface AppLog {
  _id?: string;
  // Mức độ log: info (thông tin), warn (cảnh báo), error (lỗi), debug (gỡ lỗi)
  level: 'info' | 'warn' | 'error' | 'debug';
  // Nội dung thông báo log
  message: string;
  // Mã lỗi (nếu có)
  error_code?: string;
  // ID phiên làm việc của người dùng
  session_id?: string;
  // Tên người dùng hoặc ID người dùng
  user?: string;
  // Tên module phát sinh log (ví dụ: auth, inventory, user...)
  module?: string;
  // Stack trace của lỗi (chỉ có khi level là 'error')
  stack?: string;
  // Thời gian xảy ra sự kiện (tùy chọn)
  timestamp?: Date;
  // Thời gian log được tạo trong database
  created_at?: Date;
}

/**
 * LogService - Service xử lý logic nghiệp vụ liên quan đến log ứng dụng
 * Cung cấp các phương thức: tạo log, truy vấn log, tìm kiếm log, xóa log cũ, thống kê log
 */
@Injectable()
export class LogService {
  // Logger của NestJS để ghi log cho chính LogService
  private readonly logger = new Logger(LogService.name);

  constructor(
    // Inject model Mongoose để thao tác với collection 'app_logs'
    @InjectModel('AppLog') private logModel: Model<AppLog>,
  ) {}

  /**
   * Tạo mới một bản ghi log và lưu vào MongoDB
   * @param log - Thông tin log cần lưu (không cần truyền created_at, sẽ tự động thêm)
   * @returns Bản ghi log đã được lưu
   */
  async createLog(log: AppLog): Promise<AppLog> {
    // Tạo instance mới từ logModel, tự động thêm trường created_at là thời gian hiện tại
    const newLog = new this.logModel({ ...log, created_at: new Date() });
    return await newLog.save();
  }

  /**
   * Truy vấn danh sách log với các bộ lọc và phân trang
   * @param filters - Các điều kiện lọc (level, error_code, session_id, module, khoảng thời gian)
   * @param page - Số trang (mặc định: 1)
   * @param limit - Số lượng log mỗi trang (mặc định: 50)
   * @returns Object chứa: data (danh sách log), total (tổng số log), pages (tổng số trang)
   */
  async getLogs(
    filters: {
      level?: string;
      error_code?: string;
      session_id?: string;
      module?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AppLog[]; total: number; pages: number }> {
    // Khởi tạo query object để xây dựng điều kiện truy vấn MongoDB
    const query: Record<string, unknown> = {};

    // Thêm các điều kiện lọc nếu được cung cấp
    if (filters.level) query.level = filters.level;
    if (filters.error_code) query.error_code = filters.error_code;
    if (filters.session_id) query.session_id = filters.session_id;
    if (filters.module) query.module = filters.module;

    // Xử lý lọc theo khoảng thời gian tạo log
    if (filters.startDate || filters.endDate) {
      query.created_at = {};
      // Lọc từ ngày bắt đầu (greater than or equal)
      if (filters.startDate)
        (query.created_at as Record<string, unknown>).$gte = filters.startDate;
      // Lọc đến ngày kết thúc (less than or equal)
      if (filters.endDate)
        (query.created_at as Record<string, unknown>).$lte = filters.endDate;
    }

    // Đếm tổng số bản ghi thỏa mãn điều kiện
    const total = await this.logModel.countDocuments(query);
    // Truy vấn danh sách log:
    // - Sắp xếp giảm dần theo created_at (mới nhất trước)
    // - Bỏ qua (page-1)*limit bản ghi để phân trang
    // - Giới hạn số lượng bản ghi trả về là limit
    // - Sử dụng lean() để trả về plain JavaScript object (nhanh hơn)
    const data = await this.logModel
      .find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return { data: data as AppLog[], total, pages: Math.ceil(total / limit) };
  }

  /**
   * Tìm kiếm log theo từ khóa (không phân biệt hoa thường)
   * Tìm kiếm trong các trường: message, error_code, session_id
   * @param query - Từ khóa tìm kiếm
   * @param page - Số trang (mặc định: 1)
   * @param limit - Số kết quả mỗi trang (mặc định: 50)
   * @returns Object chứa: data (danh sách log khớp), total, pages
   */
  async searchLogs(
    query: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AppLog[]; total: number; pages: number }> {
    // Xây dựng query sử dụng toán tử $or để tìm kiếm trong nhiều trường
    // $regex với $options: 'i' để tìm kiếm không phân biệt hoa thường
    const mongoQuery = {
      $or: [
        { message: { $regex: query, $options: 'i' } },
        { error_code: { $regex: query, $options: 'i' } },
        { session_id: { $regex: query, $options: 'i' } },
      ],
    };

    const total = await this.logModel.countDocuments(mongoQuery);
    const data = await this.logModel
      .find(mongoQuery)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return { data: data as AppLog[], total, pages: Math.ceil(total / limit) };
  }

  /**
   * Xóa tất cả log được tạo trước một thời điểm nhất định
   * Thường dùng để dọn dẹp log cũ định kỳ
   * @param before - Thời điểm: các log có created_at < before sẽ bị xóa
   * @returns Kết quả thao tác xóa từ MongoDB (chứa deletedCount)
   */
  async deleteLogs(before: Date): Promise<Record<string, unknown>> {
    const result = await this.logModel.deleteMany({
      created_at: { $lt: before }, // $lt = less than (trước thời điểm)
    });
    return result as unknown as Record<string, unknown>;
  }

  /**
   * Lấy thống kê số lượng log theo từng mức độ (level)
   * Sử dụng MongoDB aggregation để nhóm và đếm
   * @returns Mảng các object { _id: level, count: số_lượng }
   * Ví dụ: [{ _id: 'error', count: 15 }, { _id: 'info', count: 200 }]
   */
  async getDashboardStats(): Promise<Array<{ _id: string; count: number }>> {
    // Sử dụng aggregate pipeline để nhóm log theo trường 'level' và đếm
    const stats = await this.logModel.aggregate([
      {
        $group: {
          _id: '$level', // Nhóm theo giá trị của trường level
          count: { $sum: 1 }, // Đếm số lượng bản ghi trong mỗi nhóm
        },
      },
    ]);

    return stats as Array<{ _id: string; count: number }>;
  }
}
