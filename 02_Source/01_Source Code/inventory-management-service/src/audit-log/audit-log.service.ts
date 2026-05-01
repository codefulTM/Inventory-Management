import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument, AuditAction } from './audit-log.schema';

export interface LogContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

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

  async findAll(filters: {
    username?: string;
    action?: AuditAction;
    date_from?: Date;
    date_to?: Date;
    page?: number;
    limit?: number;
  }) {
    const query: Record<string, any> = {};

    if (filters.username) {
      query.username = { $regex: filters.username, $options: 'i' };
    }
    if (filters.action) {
      query.action = filters.action;
    }
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
        .sort({ timestamp: -1 })
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

    const logs = await this.auditLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean();

    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

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
