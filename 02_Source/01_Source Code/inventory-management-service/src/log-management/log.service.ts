// === LOG SERVICE ===
// Service quản lý log ứng dụng
// Lưu trữ log vào MongoDB collection 'app_logs'
// Cung cấp methods: tạo log, truy vấn log, tìm kiếm log, xóa log cũ, thống kê log

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export interface AppLog {
  _id?: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  error_code?: string;
  session_id?: string;
  user?: string;
  module?: string;
  stack?: string;
  timestamp?: Date;
  created_at?: Date;
}

@Injectable()
export class LogService {
  private readonly logger = new Logger(LogService.name);

  constructor(
    @InjectModel('AppLog') private logModel: Model<AppLog>,
  ) {}

  // Tạo mới bản ghi log và lưu vào MongoDB
  // Input: AppLog object (không cần truyền created_at)
  // Output: AppLog đã được lưu
  async createLog(log: AppLog): Promise<AppLog> {
    // [RÚT GỌN: Tạo instance mới từ logModel → tự động thêm created_at → save vào DB]
  }

  // Truy vấn danh sách log với filters và phân trang
  // Filters: level, error_code, session_id, module, startDate, endDate
  // Pagination: page (default 1), limit (default 50)
  // Output: { data: AppLog[], total: number, pages: number }
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
    // [RÚT GỌN: Build MongoDB query → apply filters → sort by created_at desc → pagination → return results]
  }

  // Tìm kiếm log theo từ khóa (không phân biệt hoa thường)
  // Search in: message, error_code, session_id
  // Output: { data: AppLog[], total: number, pages: number }
  async searchLogs(
    query: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AppLog[]; total: number; pages: number }> {
    // [RÚT GỌN: Build MongoDB query với $or và $regex → search across fields → return results]
  }

  // Xóa tất cả log được tạo trước một thời điểm nhất định
  // Input: Date - các log có created_at < before sẽ bị xóa
  // Output: { deletedCount }
  async deleteLogs(before: Date): Promise<Record<string, unknown>> {
    // [RÚT GỌN: deleteMany với created_at < before]
  }

  // Lấy thống kê số lượng log theo từng mức độ (level)
  // Output: Array<{ _id: level, count: number }>
  // Ví dụ: [{ _id: 'error', count: 15 }, { _id: 'info', count: 200 }]
  async getDashboardStats(): Promise<Array<{ _id: string; count: number }>> {
    // [RÚT GỌN: MongoDB aggregate → group by level → count]
  }
}