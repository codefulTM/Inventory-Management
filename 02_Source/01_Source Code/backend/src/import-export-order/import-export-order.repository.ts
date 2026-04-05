import { Injectable, Logger } from '@nestjs/common';
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
import { Counter, CounterDocument } from '../schemas/counter.schema';
import { Warehouse, WarehouseDocument } from '../schemas/warehouse.schema';
import {
  StorageLocation,
  StorageLocationDocument,
} from '../schemas/storage-location.schema';

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

export interface MaterialOptionsQuery {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface InventoryLotOptionsQuery {
  q?: string;
  material_id?: string;
  status?: string;
  exclude_statuses?: string[];
  warehouse_id?: string;
  page?: number;
  limit?: number;
}

export interface WarehouseOptionsQuery {
  q?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface StorageLocationOptionsQuery {
  warehouse_id?: string;
  q?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class ImportExportOrderRepository {
  private readonly logger = new Logger(ImportExportOrderRepository.name);

  constructor(
    @InjectModel(ImportExportOrder.name)
    private readonly model: Model<ImportExportOrderDocument>,
    @InjectModel(InventoryLot.name)
    private readonly inventoryLotModel: Model<InventoryLotDocument>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
    @InjectModel(InventoryTransaction.name)
    private readonly inventoryTransactionModel: Model<InventoryTransactionDocument>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
    @InjectModel(StorageLocation.name)
    private readonly storageLocationModel: Model<StorageLocationDocument>,
  ) {}

  private parseLotSequence(lotId?: string): number {
    if (!lotId) {
      return 0;
    }

    const match = /^LOT-(\d+)$/i.exec(lotId.trim());
    if (!match) {
      return 0;
    }

    return Number(match[1]);
  }

  private async getCurrentLotMaxSequence(session?: ClientSession) {
    const lotRegex = /^LOT-\d+$/i;

    const lotQuery = this.inventoryLotModel.find(
      { lot_id: lotRegex },
      { lot_id: 1, _id: 0 },
    );
    if (session) {
      lotQuery.session(session);
    }

    const orderQuery = this.model.find(
      {
        order_type: 'Inbound',
        'items.lot_id': lotRegex,
      },
      { items: 1, _id: 0 },
    );
    if (session) {
      orderQuery.session(session);
    }

    const [existingLots, existingInboundOrders] = await Promise.all([
      lotQuery.lean().exec(),
      orderQuery.lean().exec(),
    ]);

    let max = 0;

    for (const lot of existingLots) {
      const value = this.parseLotSequence(String(lot.lot_id));
      if (value > max) {
        max = value;
      }
    }

    for (const order of existingInboundOrders) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const value = this.parseLotSequence(String(item?.lot_id ?? ''));
        if (value > max) {
          max = value;
        }
      }
    }

    return max;
  }

  async reserveNextLotId(session?: ClientSession) {
    const counterName = 'inventory_lot_sequence';

    const counterQuery = this.counterModel.findOne({ name: counterName });
    if (session) {
      counterQuery.session(session);
    }

    const existingCounter = await counterQuery.exec();

    if (!existingCounter) {
      const maxSequence = await this.getCurrentLotMaxSequence(session);
      await this.counterModel
        .findOneAndUpdate(
          { name: counterName },
          {
            $setOnInsert: {
              name: counterName,
              seq: maxSequence,
            },
          },
          {
            new: true,
            upsert: true,
            ...(session ? { session } : {}),
          },
        )
        .exec();
    }

    const updated = await this.counterModel
      .findOneAndUpdate(
        { name: counterName },
        { $inc: { seq: 1 } },
        {
          new: true,
          ...(session ? { session } : {}),
        },
      )
      .exec();

    if (!updated) {
      throw new Error('Failed to reserve next lot sequence');
    }

    return `LOT-${String(updated.seq).padStart(3, '0')}`;
  }

  async createProvisionalInboundLot(
    payload: {
      lot_id: string;
      material_id: string;
      unit_of_measure: string;
      storage_location?: string;
      warehouse_id?: string;
      received_by: string;
    },
    session?: ClientSession,
  ) {
    const now = new Date();
    const expiration = new Date(now);
    expiration.setFullYear(expiration.getFullYear() + 1);

    return this.inventoryLotModel
      .findOneAndUpdate(
        { lot_id: payload.lot_id },
        {
          $setOnInsert: {
            lot_id: payload.lot_id,
            material_id: payload.material_id,
            manufacturer_name: 'AUTO_INBOUND',
            manufacturer_lot: payload.lot_id,
            supplier_name: 'PENDING_SUPPLIER',
            received_date: now,
            expiration_date: expiration,
            status: 'Quarantine',
            quantity: 0,
            unit_of_measure: payload.unit_of_measure,
            storage_location: payload.storage_location,
            warehouse_id: payload.warehouse_id,
            is_sample: false,
            notes:
              'Auto-created from inbound confirmation. Please enrich lot metadata if needed.',
            received_by: payload.received_by,
          },
        },
        {
          new: true,
          upsert: true,
          ...(session ? { session } : {}),
        },
      )
      .exec();
  }

  async runInTransaction<T>(
    work: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.model.db.startSession();

    try {
      let result: T | undefined;

      try {
        await session.withTransaction(async () => {
          result = await work(session);
        });
      } catch (error) {
        if (!this.isUnsupportedTransactionError(error)) {
          throw error;
        }

        this.logger.warn(
          'MongoDB deployment does not support transactions, retrying without transaction.',
        );

        result = await work();
      }

      if (result === undefined) {
        throw new Error('Transaction completed without a result');
      }

      return result;
    } finally {
      await session.endSession();
    }
  }

  private isUnsupportedTransactionError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return message.includes(
      'transaction numbers are only allowed on a replica set member or mongos',
    );
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
    session?: ClientSession,
  ) {
    return this.model
      .findOneAndUpdate(
        {
          order_id: orderId,
          status: ImportExportOrderStatus.PENDING_CONFIRMATION,
        },
        dto,
        { new: true, ...(session ? { session } : {}) },
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

  async findWarehouseById(warehouseId: string) {
    return this.warehouseModel
      .findOne({ warehouse_id: warehouseId })
      .lean()
      .exec();
  }

  async findStorageLocationById(locationId: string) {
    return this.storageLocationModel
      .findOne({ location_id: locationId })
      .lean()
      .exec();
  }

  async findMaterialOptions(query: MaterialOptionsQuery = {}) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;
    const keyword = query.q?.trim();

    const mongoQuery: Record<string, unknown> = {};
    if (query.status) {
      mongoQuery.status = query.status;
    }

    if (keyword) {
      const regex = new RegExp(keyword, 'i');
      mongoQuery.$or = [
        { material_id: regex },
        { material_name: regex },
        { part_number: regex },
      ];
    }

    const [items, total] = await Promise.all([
      this.materialModel
        .find(mongoQuery)
        .select({
          _id: 0,
          material_id: 1,
          material_name: 1,
          part_number: 1,
        })
        .sort({ material_id: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.materialModel.countDocuments(mongoQuery).exec(),
    ]);

    return { items, total, page, limit };
  }

  async findInventoryLotOptions(query: InventoryLotOptionsQuery = {}) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;
    const keyword = query.q?.trim();

    const mongoQuery: Record<string, unknown> = {};

    if (query.material_id) {
      mongoQuery.material_id = query.material_id;
    }

    if (query.status) {
      mongoQuery.status = query.status;
    }

    if (query.exclude_statuses && query.exclude_statuses.length > 0) {
      mongoQuery.status = {
        $nin: query.exclude_statuses,
      };
    }

    if (query.warehouse_id) {
      mongoQuery.warehouse_id = query.warehouse_id;
    }

    if (keyword) {
      const regex = new RegExp(keyword, 'i');
      mongoQuery.$or = [
        { lot_id: regex },
        { material_id: regex },
        { manufacturer_lot: regex },
      ];
    }

    const [lots, total] = await Promise.all([
      this.inventoryLotModel
        .find(mongoQuery)
        .select({
          _id: 0,
          lot_id: 1,
          material_id: 1,
          quantity: 1,
          unit_of_measure: 1,
          status: 1,
          storage_location: 1,
          warehouse_id: 1,
          manufacturer_lot: 1,
        })
        .sort({ lot_id: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.inventoryLotModel.countDocuments(mongoQuery).exec(),
    ]);

    const materialIds = Array.from(
      new Set(lots.map((lot) => String(lot.material_id))),
    );

    const materials = materialIds.length
      ? await this.materialModel
          .find({ material_id: { $in: materialIds } })
          .select({ _id: 0, material_id: 1, material_name: 1 })
          .lean()
          .exec()
      : [];

    const materialNameMap = new Map<string, string>(
      materials.map((material) => [
        String(material.material_id),
        String(material.material_name ?? ''),
      ]),
    );

    const items = lots.map((lot) => ({
      ...lot,
      material_name: materialNameMap.get(String(lot.material_id)) ?? null,
    }));

    return { items, total, page, limit };
  }

  async findWarehouseOptions(query: WarehouseOptionsQuery = {}) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;
    const keyword = query.q?.trim();

    const mongoQuery: Record<string, unknown> = {};

    if (typeof query.is_active === 'boolean') {
      mongoQuery.is_active = query.is_active;
    }

    if (keyword) {
      const regex = new RegExp(keyword, 'i');
      mongoQuery.$or = [{ warehouse_id: regex }, { warehouse_name: regex }];
    }

    const [items, total] = await Promise.all([
      this.warehouseModel
        .find(mongoQuery)
        .select({
          _id: 0,
          warehouse_id: 1,
          warehouse_name: 1,
          is_active: 1,
        })
        .sort({ warehouse_id: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.warehouseModel.countDocuments(mongoQuery).exec(),
    ]);

    return { items, total, page, limit };
  }

  async findStorageLocationOptions(query: StorageLocationOptionsQuery = {}) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;
    const keyword = query.q?.trim();

    const mongoQuery: Record<string, unknown> = {};

    if (query.warehouse_id) {
      mongoQuery.warehouse_id = query.warehouse_id;
    }

    if (typeof query.is_active === 'boolean') {
      mongoQuery.is_active = query.is_active;
    }

    if (keyword) {
      const regex = new RegExp(keyword, 'i');
      mongoQuery.$or = [{ location_id: regex }, { location_name: regex }];
    }

    const [items, total] = await Promise.all([
      this.storageLocationModel
        .find(mongoQuery)
        .select({
          _id: 0,
          location_id: 1,
          warehouse_id: 1,
          location_name: 1,
          is_active: 1,
        })
        .sort({ location_id: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.storageLocationModel.countDocuments(mongoQuery).exec(),
    ]);

    return { items, total, page, limit };
  }

  async increaseLotQuantity(
    lotId: string,
    quantity: number,
    session?: ClientSession,
  ) {
    return this.inventoryLotModel
      .findOneAndUpdate(
        { lot_id: lotId },
        { $inc: { quantity } },
        { new: true, ...(session ? { session } : {}) },
      )
      .exec();
  }

  async decreaseLotQuantityIfEnough(
    lotId: string,
    quantity: number,
    session?: ClientSession,
  ) {
    return this.inventoryLotModel
      .findOneAndUpdate(
        {
          lot_id: lotId,
          quantity: { $gte: quantity },
        },
        { $inc: { quantity: -quantity } },
        { new: true, ...(session ? { session } : {}) },
      )
      .exec();
  }

  async updateLotStatus(
    lotId: string,
    status: string,
    session?: ClientSession,
  ) {
    return this.inventoryLotModel
      .findOneAndUpdate(
        { lot_id: lotId },
        { status },
        { new: true, ...(session ? { session } : {}) },
      )
      .exec();
  }

  async createInventoryTransactions(
    payloads: InventoryTransactionCreatePayload[],
    session?: ClientSession,
  ) {
    return this.inventoryTransactionModel.insertMany(payloads, {
      ...(session ? { session } : {}),
    });
  }
}
