import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import {
  ImportExportOrderAttachment,
  ImportExportOrder,
  ImportExportOrderDocument,
  ImportExportOrderStatus,
} from '../schemas/import-export-order.schema';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../schemas/inventory-lot.schema';
import { Material, MaterialDocument } from '../schemas/material.schema';
import {
  InventoryTransaction,
  InventoryTransactionDocument,
} from '../schemas/inventory-transaction.schema';

export interface ImportExportOrderFilterOptions {
  status?: string;
  order_type?: string;
  created_by?: string;
  from?: Date;
  to?: Date;
}

export interface ImportExportOrderPaginationOptions {
  page?: number;
  limit?: number;
}

interface ImportExportOrderMongoQuery {
  status?: string;
  order_type?: string;
  created_by?: string;
  created_date?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export interface InventoryTransactionCreatePayload {
  transaction_id: string;
  lot_id: string;
  transaction_type: string;
  quantity: number;
  unit_of_measure: string;
  transaction_date: Date;
  reference_number?: string;
  performed_by: string;
  notes?: string;
}

@Injectable()
export class ImportExportOrderRepository {
  constructor(
    @InjectModel(ImportExportOrder.name)
    private readonly model: Model<ImportExportOrderDocument>,
    @InjectModel(InventoryLot.name)
    private readonly inventoryLotModel: Model<InventoryLotDocument>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
    @InjectModel(InventoryTransaction.name)
    private readonly inventoryTransactionModel: Model<InventoryTransactionDocument>,
  ) {}

  async runInTransaction<T>(
    work: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.model.db.startSession();

    try {
      let result: T | undefined;

      await session.withTransaction(async () => {
        result = await work(session);
      });

      if (result === undefined) {
        throw new Error('Transaction completed without a result');
      }

      return result;
    } finally {
      await session.endSession();
    }
  }

  async create(dto: Partial<ImportExportOrder>) {
    const doc = new this.model(dto);
    return doc.save();
  }

  async findAll(
    filters: ImportExportOrderFilterOptions = {},
    pagination: ImportExportOrderPaginationOptions = { page: 1, limit: 20 },
  ) {
    const mongoQuery: ImportExportOrderMongoQuery = {};

    if (filters.status) {
      mongoQuery.status = filters.status;
    }

    if (filters.order_type) {
      mongoQuery.order_type = filters.order_type;
    }

    if (filters.created_by) {
      mongoQuery.created_by = filters.created_by;
    }

    if (filters.from || filters.to) {
      mongoQuery.created_date = {};
      if (filters.from) mongoQuery.created_date.$gte = filters.from;
      if (filters.to) mongoQuery.created_date.$lte = filters.to;
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
      this.model.countDocuments(mongoQuery).exec(),
    ]);

    return { items, total, page, limit };
  }

  async findOneByOrderId(orderId: string, session?: ClientSession) {
    const query = this.model.findOne({ order_id: orderId });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async updateByOrderId(
    orderId: string,
    dto: Partial<ImportExportOrder>,
    session?: ClientSession,
  ) {
    return this.model
      .findOneAndUpdate({ order_id: orderId }, dto, {
        new: true,
        ...(session ? { session } : {}),
      })
      .exec();
  }

  async updatePendingByOrderId(
    orderId: string,
    dto: Partial<ImportExportOrder>,
    session: ClientSession,
  ) {
    return this.model
      .findOneAndUpdate(
        {
          order_id: orderId,
          status: ImportExportOrderStatus.PENDING_CONFIRMATION,
        },
        dto,
        { new: true, session },
      )
      .exec();
  }

  async appendAttachment(
    orderId: string,
    attachment: ImportExportOrderAttachment,
    session?: ClientSession,
  ) {
    return this.model
      .findOneAndUpdate(
        { order_id: orderId },
        { $push: { attachments: attachment } },
        { new: true, ...(session ? { session } : {}) },
      )
      .exec();
  }

  async findLotByLotId(scanCode: string, session?: ClientSession) {
    const query = this.inventoryLotModel.findOne({ lot_id: scanCode });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findLotByManufacturerLot(scanCode: string) {
    return this.inventoryLotModel
      .findOne({ manufacturer_lot: scanCode })
      .exec();
  }

  async findMaterialByMaterialId(scanCode: string) {
    return this.materialModel.findOne({ material_id: scanCode }).exec();
  }

  async findMaterialByPartNumber(scanCode: string) {
    return this.materialModel.findOne({ part_number: scanCode }).exec();
  }

  async increaseLotQuantity(
    lotId: string,
    quantity: number,
    session: ClientSession,
  ) {
    return this.inventoryLotModel
      .findOneAndUpdate(
        { lot_id: lotId },
        { $inc: { quantity } },
        { new: true, session },
      )
      .exec();
  }

  async decreaseLotQuantityIfEnough(
    lotId: string,
    quantity: number,
    session: ClientSession,
  ) {
    return this.inventoryLotModel
      .findOneAndUpdate(
        {
          lot_id: lotId,
          quantity: { $gte: quantity },
        },
        { $inc: { quantity: -quantity } },
        { new: true, session },
      )
      .exec();
  }

  async updateLotStatus(lotId: string, status: string, session: ClientSession) {
    return this.inventoryLotModel
      .findOneAndUpdate({ lot_id: lotId }, { status }, { new: true, session })
      .exec();
  }

  async createInventoryTransactions(
    payloads: InventoryTransactionCreatePayload[],
    session: ClientSession,
  ) {
    return this.inventoryTransactionModel.insertMany(payloads, { session });
  }
}
