// Import các decorator và class từ NestJS
import { Injectable } from '@nestjs/common';
// Import decorator để tiêm Mongoose Model và kiểu Model
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// Import các kiểu dữ liệu từ schema
import { AuditLog, AuditLogDocument, AuditAction } from './audit-log.schema';

/**
 * Interface định nghĩa ngữ cảnh khi ghi log
 * Chứa thông tin về request để phục vụ việc truy vết
 */
export interface LogContext {
  ip?: string;           // Địa chỉ IP của người dùng
  userAgent?: string;    // Thông tin trình duyệt/ứng dụng
}

/**
 * Service xử lý mọi logic nghiệp vụ liên quan đến Audit Log
 * Được thiết kế để bất kỳ service nào cũng có thể tiêm và sử dụng để ghi log
 */
@Injectable()
export class AuditLogService {
  /**
   * Constructor: Tiêm Mongoose Model cho AuditLog
   * @param auditLogModel - Model để thao tác với collection audit_logs trong MongoDB
   */
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Ghi một entry mới vào audit log
   * Phương thức này không trả về dữ liệu (void) nên không ảnh hưởng đến luồng chính
   * Nếu ghi log thất bại, lỗi sẽ được throw để caller xử lý
   * 
   * @param username - Tên người dùng thực hiện hành động
   * @param action - Loại hành động (phải là giá trị trong AuditAction)
   * @param ctx - Ngữ cảnh request (IP, User Agent)
   * @param details - Chi tiết bổ sung về hành động (tùy chọn)
   * @param user_id - ID của người dùng (tùy chọn)
   */
  async log(
    username: string,
    action: AuditAction,
    ctx: LogContext = {},
    details?: Record<string, any>,
    user_id?: string,
  ): Promise<void> {
    // Tạo một document mới trong MongoDB với tất cả thông tin cần thiết
    await this.auditLogModel.create({
      username,
      user_id,
      action,
      ip: ctx.ip,
      user_agent: ctx.userAgent,
      details,
      timestamp: new Date(),
    });
  }

  /**
   * Tìm kiếm audit log với các bộ lọc và phân trang
   * Trả về danh sách kết quả kèm thông tin phân trang
   * 
   * @param filters - Các bộ lọc tìm kiếm
   * @param filters.username - Lọc theo tên người dùng (tùy chọn, tìm kiếm không phân biệt hoa thường)
   * @param filters.action - Lọc theo loại hành động (tùy chọn)
   * @param filters.date_from - Lọc từ ngày (tùy chọn)
   * @param filters.date_to - Lọc đến ngày (tùy chọn)
   * @param filters.page - Số trang (mặc định 1)
   * @param filters.limit - Số lượng kết quả mỗi trang (mặc định 50)
   * @returns Object chứa danh sách dữ liệu và thông tin phân trang
   */
  async findAll(filters: {
    username?: string;
    action?: AuditAction;
    date_from?: Date;
    date_to?: Date;
    page?: number;
    limit?: number;
  }) {
    // Xây dựng query object dựa trên các bộ lọc
    const query: Record<string, any> = {};

    // Lọc theo username (tìm kiếm không phân biệt hoa thường)
    if (filters.username) {
      query.username = { $regex: filters.username, $options: 'i' };
    }
    
    // Lọc theo loại hành động (chính xác)
    if (filters.action) {
      query.action = filters.action;
    }
    
    // Lọc theo khoảng thời gian
    if (filters.date_from || filters.date_to) {
      query.timestamp = {};
      if (filters.date_from) query.timestamp.$gte = filters.date_from;  // Lớn hơn hoặc bằng từ ngày
      if (filters.date_to) query.timestamp.$lte = filters.date_to;    // Nhỏ hơn hoặc bằng đến ngày
    }

    // Tính toán thông số phân trang
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;  // Số documents cần bỏ qua

    // Thực hiện song song 2 truy vấn: lấy dữ liệu và đếm tổng số
    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(query)                      // Tìm theo query
        .sort({ timestamp: -1 })          // Sắp xếp mới nhất trước
        .skip(skip)                       // Bỏ qua các kết quả của trang trước
        .limit(limit)                     // Giới hạn số kết quả trả về
        .lean(),                          // Trả về plain JavaScript objects (nhanh hơn)
      this.auditLogModel.countDocuments(query),  // Đếm tổng số documents thỏa mãn điều kiện
    ]);

    // Trả về kết quả kèm thông tin phân trang
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),  // Tính tổng số trang
      },
    };
  }

  /**
   * Xuất dữ liệu audit log ra định dạng CSV (Comma-Separated Values)
   * Giới hạn tối đa 10,000 dòng để tránh quá tải
   * 
   * @param filters - Các bộ lọc tìm kiếm (giống findAll nhưng không phân trang)
   * @returns Chuỗi CSV với header và các dòng dữ liệu
   */
  async exportCsv(filters: {
    username?: string;
    action?: AuditAction;
    date_from?: Date;
    date_to?: Date;
  }): Promise<string> {
    // Xây dựng query object (tương tự findAll)
    const query: Record<string, any> = {};
    if (filters.username) {
      query.username = { $regex: filters.username, $options: 'i' };
    }
    if (filters.action) query.action = filters.action;
    if (filters.date_from || filters.date_to) {
      query.timestamp = {};
      if (filters.date_from) query.timestamp.$gte = filters.date_from;
      if (filters.date_to) query.timestamp.$lte = filters.date_to;
    }

    // Lấy tối đa 10,000 bản ghi, sắp xếp mới nhất trước
    const logs = await this.auditLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean();

    // Hàm escape giá trị CSV: bọc trong dấu nháy kép và nhân đôi dấu nháy kép bên trong
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    // Tạo header cho file CSV (tiếng Việt)
    const header = ['Thời gian', 'Người dùng', 'Hành động', 'IP', 'Trình duyệt', 'Chi tiết'].join(',');
    
    // Tạo các dòng dữ liệu
    const rows = logs.map((l) =>
      [
        escape(new Date(l.timestamp).toLocaleString('vi-VN')),  // Định dạng thời gian kiểu Việt Nam
        escape(l.username),
        escape(l.action),
        escape(l.ip ?? ''),
        escape(l.user_agent ?? ''),
        escape(l.details ? JSON.stringify(l.details) : ''),     // Chi tiết dạng JSON string
      ].join(','),
    );

    // Ghép header và các dòng lại thành một chuỗi CSV hoàn chỉnh
    return [header, ...rows].join('\n');
  }
}
