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

  constructor(@InjectModel('AppLog') private logModel: Model<any>) {}

  async createLog(log: AppLog): Promise<AppLog> {
    const newLog = new this.logModel({ ...log, created_at: new Date() });
    return newLog.save();
  }

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
    const query: any = {};

    if (filters.level) query.level = filters.level;
    if (filters.error_code) query.error_code = filters.error_code;
    if (filters.session_id) query.session_id = filters.session_id;
    if (filters.module) query.module = filters.module;

    if (filters.startDate || filters.endDate) {
      query.created_at = {};
      if (filters.startDate) query.created_at.$gte = filters.startDate;
      if (filters.endDate) query.created_at.$lte = filters.endDate;
    }

    const total = await this.logModel.countDocuments(query);
    const data = await this.logModel
      .find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return { data: data as AppLog[], total, pages: Math.ceil(total / limit) };
  }

  async searchLogs(query: string, page: number = 1, limit: number = 50): Promise<any> {
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

  async deleteLogs(before: Date): Promise<any> {
    const result = await this.logModel.deleteMany({ created_at: { $lt: before } });
    return result;
  }

  async getDashboardStats(): Promise<any> {
    const stats = await this.logModel.aggregate([
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 },
        },
      },
    ]);

    return stats;
  }
}
