import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InventoryAuditReport,
  InventoryAuditReportDocument,
  InventoryAuditReportStatus,
} from '../schemas/inventory-audit-report.schema';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../schemas/inventory-lot.schema';
import { Material, MaterialDocument } from '../schemas/material.schema';
import { Warehouse, WarehouseDocument } from '../schemas/warehouse.schema';

export interface InventoryAuditReportFilters {
  status?: InventoryAuditReportStatus;
  requested_by?: string;
  from?: Date;
  to?: Date;
}

export interface InventoryAuditReportPagination {
  page?: number;
  limit?: number;
}

interface InventoryAuditReportMongoQuery {
  status?: InventoryAuditReportStatus;
  requested_by?: string;
  created_date?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export interface InventoryAuditReportSnapshotItem {
  lot_id: string;
  material_id: string;
  material_name: string;
  warehouse_id: string;
  warehouse_name: string;
  storage_location: string;
  quantity: number;
  unit_of_measure: string;
  status: string;
  expiration_date?: Date;
}

interface InventoryLotSnapshotRow {
  lot_id: string;
  material_id: string;
  warehouse_id?: string;
  storage_location?: string;
  quantity: number;
  unit_of_measure: string;
  status: string;
  expiration_date?: Date;
}

export interface CreateInventoryAuditReportPayload {
  report_id: string;
  period_from: Date;
  period_to: Date;
  scope_warehouse_ids: string[];
  report_template_code: string;
  status: InventoryAuditReportStatus;
  requested_by: string;
  approved_by?: string;
  note?: string;
}

@Injectable()
export class InventoryAuditReportRepository {
  constructor(
    @InjectModel(InventoryAuditReport.name)
    private readonly reportModel: Model<InventoryAuditReportDocument>,
    @InjectModel(InventoryLot.name)
    private readonly inventoryLotModel: Model<InventoryLotDocument>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
  ) {}

  async createDraft(payload: CreateInventoryAuditReportPayload) {
    const doc = new this.reportModel(payload);
    return doc.save();
  }

  async markProcessing(reportId: string) {
    return this.reportModel
      .findOneAndUpdate(
        { report_id: reportId },
        {
          status: InventoryAuditReportStatus.PROCESSING,
          failure_reason: null,
        },
        { new: true },
      )
      .exec();
  }

  async markReady(
    reportId: string,
    data: {
      summary_total_items: number;
      summary_total_quantity: number;
      summary_total_value: number;
      file_storage_key: string;
      file_sha256: string;
      file_size_bytes: number;
      pdf_version: string;
      signed_at: Date;
      signature_provider: string;
      signature_serial_number?: string;
      signature_valid_from?: Date;
      signature_valid_to?: Date;
      approved_by?: string;
    },
  ) {
    return this.reportModel
      .findOneAndUpdate(
        { report_id: reportId },
        {
          ...data,
          status: InventoryAuditReportStatus.READY,
          failure_reason: null,
        },
        { new: true },
      )
      .exec();
  }

  async markFailed(reportId: string, reason: string) {
    return this.reportModel
      .findOneAndUpdate(
        { report_id: reportId },
        {
          status: InventoryAuditReportStatus.FAILED,
          failure_reason: reason.slice(0, 500),
        },
        { new: true },
      )
      .exec();
  }

  async findByReportId(reportId: string) {
    return this.reportModel.findOne({ report_id: reportId }).exec();
  }

  async findAll(
    filters: InventoryAuditReportFilters,
    pagination: InventoryAuditReportPagination,
  ) {
    const query: InventoryAuditReportMongoQuery = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.requested_by) {
      query.requested_by = filters.requested_by;
    }

    if (filters.from || filters.to) {
      query.created_date = {};
      if (filters.from) {
        query.created_date.$gte = filters.from;
      }
      if (filters.to) {
        query.created_date.$lte = filters.to;
      }
    }

    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const limit =
      pagination.limit && pagination.limit > 0 ? pagination.limit : 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.reportModel
        .find(query)
        .sort({ created_date: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reportModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit };
  }

  async getSnapshotItems(params: {
    periodTo: Date;
    warehouseIds?: string[];
    includeZeroBalance?: boolean;
  }): Promise<InventoryAuditReportSnapshotItem[]> {
    const match: Record<string, unknown> = {
      modified_date: { $lte: params.periodTo },
    };

    if (params.warehouseIds && params.warehouseIds.length > 0) {
      match.warehouse_id = { $in: params.warehouseIds };
    }

    if (!params.includeZeroBalance) {
      match.quantity = { $gt: 0 };
    }

    const lots = await this.inventoryLotModel
      .find(match)
      .select({
        lot_id: 1,
        material_id: 1,
        warehouse_id: 1,
        storage_location: 1,
        quantity: 1,
        unit_of_measure: 1,
        status: 1,
        expiration_date: 1,
      })
      .lean<InventoryLotSnapshotRow[]>()
      .exec();

    if (lots.length === 0) {
      return [];
    }

    const materialIds = [
      ...new Set(lots.map((lot) => String(lot.material_id))),
    ];
    const warehouseIds = [
      ...new Set(
        lots
          .map((lot) => lot.warehouse_id)
          .filter((value): value is string => typeof value === 'string'),
      ),
    ] as string[];

    const [materials, warehouses] = await Promise.all([
      this.materialModel
        .find({ material_id: { $in: materialIds } })
        .select({ material_id: 1, material_name: 1 })
        .lean()
        .exec(),
      this.warehouseModel
        .find({ warehouse_id: { $in: warehouseIds } })
        .select({ warehouse_id: 1, warehouse_name: 1 })
        .lean()
        .exec(),
    ]);

    const materialMap = new Map(
      materials.map((item) => [item.material_id, item.material_name]),
    );
    const warehouseMap = new Map(
      warehouses.map((item) => [item.warehouse_id, item.warehouse_name]),
    );

    return lots
      .map((lot) => ({
        lot_id: String(lot.lot_id),
        material_id: String(lot.material_id),
        material_name:
          materialMap.get(String(lot.material_id)) ?? String(lot.material_id),
        warehouse_id: lot.warehouse_id ?? 'N/A',
        warehouse_name: lot.warehouse_id
          ? (warehouseMap.get(lot.warehouse_id) ?? lot.warehouse_id)
          : 'Không xác định',
        storage_location: lot.storage_location ?? 'N/A',
        quantity: Number(lot.quantity),
        unit_of_measure: String(lot.unit_of_measure),
        status: String(lot.status),
        expiration_date: lot.expiration_date,
      }))
      .sort((a, b) => {
        if (a.warehouse_id !== b.warehouse_id) {
          return a.warehouse_id.localeCompare(b.warehouse_id);
        }
        if (a.material_id !== b.material_id) {
          return a.material_id.localeCompare(b.material_id);
        }
        return a.lot_id.localeCompare(b.lot_id);
      });
  }
}
