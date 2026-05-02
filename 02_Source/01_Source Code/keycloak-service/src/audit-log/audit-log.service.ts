/**
 * File: audit-log.service.ts
 * Mô tả: Service ghi nhận và quản lý audit log — nhật ký kiểm toán các hành động quan trọng.
 *
 * Chức năng chính:
 * - Ghi log các sự kiện: đăng nhập, đăng xuất, tạo/sửa/xóa user, khóa/mở khóa, đặt lại mật khẩu
 * - Lưu thông tin ngữ cảnh: IP, User Agent, timestamp
 * - Truy vấn audit log có phân trang và lọc (theo username, action, khoảng thời gian)
 * - Xuất audit log ra định dạng CSV để báo cáo
 *
 * Audit log được lưu trong MongoDB collection 'audit_logs' và không thể sửa đổi (immutable).
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument, AuditAction } from './audit-log.schema';

/**
 * LogContext — Thông tin ngữ cảnh của request (IP, User Agent)
 * Được trích xuất từ HTTP headers khi ghi log
 */
export interface LogContext {
  /** Địa chỉ IP của client */
  ip?: string;
  /** Chuỗi User Agent của trình duyệt/client */
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Ghi một bản ghi audit log vào MongoDB
   * @param username - Tên đăng nhập của người thực hiện hành động
   * @param action - Loại hành động (từ enum AuditAction)
   * @param ctx - Thông tin ngữ cảnh (IP, User Agent)
   * @param details - Chi tiết bổ sung (dạng key-value, tùy chọn)
   * @param user_id - ID nội bộ của user (tùy chọn)
   */
  async log(
    username: string,
    action: AuditAction,
    ctx: LogContext = {},
    details?: Record<string, any>,
    user_id?: string,
  ): Promise<void> {
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
   * Truy vấn audit log có phân trang và bộ lọc
   * Hỗ trợ lọc theo: username (regex), action, khoảng thời gian (date_from → date_to)
   * Kết quả sắp xếp theo timestamp mới nhất trước
   */
  async findAll(filters: {
    username?: string;
    action?: AuditAction;
    date_from?: Date;
    date_to?: Date;
    page?: number;
    limit?: number;
  }) {
    const query: Record<string, any> = {};

    // Lọc theo username (case-insensitive)
    if (filters.username) {
      query.username = { $regex: filters.username, $options: 'i' };
    }
    // Lọc theo loại hành động
    if (filters.action) {
      query.action = filters.action;
    }
    // Lọc theo khoảng thời gian
    if (filters.date_from || filters.date_to) {
      query.timestamp = {};
      if (filters.date_from) query.timestamp.$gte = filters.date_from;
      if (filters.date_to) query.timestamp.$lte = filters.date_to;
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ timestamp: -1 }) // Mới nhất trước
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auditLogModel.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Xuất audit log ra định dạng CSV (tối đa 10,000 bản ghi)
   * Hỗ trợ cùng bộ lọc như findAll
   * Column: Thời gian, Người dùng, Hành động, IP, Trình duyệt, Chi tiết
   */
  async exportCsv(filters: {
    username?: string;
    action?: AuditAction;
    date_from?: Date;
    date_to?: Date;
  }): Promise<string> {
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

    // Lấy tối đa 10,000 bản ghi để tránh quá tải
    const logs = await this.auditLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean();

    // Escape giá trị cho CSV (bọc trong ngoặc kép, escape dấu ngoặc kép)
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    // Header tiếng Việt
    const header = ['Thời gian', 'Người dùng', 'Hành động', 'IP', 'Trình duyệt', 'Chi tiết'].join(',');
    const rows = logs.map((l) =>
      [
        escape(new Date(l.timestamp).toLocaleString('vi-VN')),
        escape(l.username),
        escape(l.action),
        escape(l.ip ?? ''),
        escape(l.user_agent ?? ''),
        escape(l.details ? JSON.stringify(l.details) : ''),
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }
}
