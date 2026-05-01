import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WarehouseLocation,
  WarehouseLocationDocument,
  LocationLevel,
} from '../schemas/warehouse-location.schema';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../schemas/inventory-lot.schema';

export interface LocationNode {
  location_code: string;
  location_name: string;
  level: LocationLevel;
  quantity: number;
  capacity?: number;
  is_active: boolean;
  children: LocationNode[];
  notes?: string;
}

/**
 * Warehouse Hierarchy Service
 * Manages warehouse location hierarchy and real-time inventory counts
 */
@Injectable()
export class WarehouseHierarchyService {
  private readonly logger = new Logger(WarehouseHierarchyService.name);

  constructor(
    @InjectModel(WarehouseLocation.name)
    private locationModel: Model<WarehouseLocationDocument>,
    @InjectModel(InventoryLot.name)
    private inventoryLotModel: Model<InventoryLotDocument>,
  ) {}

  /**
   * Get warehouse hierarchy tree with real-time inventory counts
   * @returns - Warehouse hierarchy tree
   */
  async getWarehouseHierarchy(): Promise<LocationNode[]> {
    this.logger.debug('Fetching warehouse hierarchy');

    // Get all warehouse level locations (root nodes)
    const warehouses = await this.locationModel
      .find({ level: LocationLevel.WAREHOUSE, is_active: true })
      .lean()
      .exec();

    if (warehouses.length === 0) {
      this.logger.warn('No warehouses found');
      return [];
    }

    // Build hierarchy for each warehouse
    const hierarchy: LocationNode[] = [];
    for (const warehouse of warehouses) {
      const warehouseNode = await this.buildLocationNode(warehouse);
      hierarchy.push(warehouseNode);
    }

    return hierarchy;
  }

  /**
   * Get inventory count for a specific location and all sub-locations
   * @param locationCode - Location code
   * @returns - Total quantity at location and children
   */
  async getLocationInventoryCount(locationCode: string): Promise<number> {
    const location = await this.locationModel
      .findOne({ location_code: locationCode })
      .lean()
      .exec();

    if (!location) {
      throw new NotFoundException(`Location '${locationCode}' not found`);
    }

    // Get all child locations
    const allChildren = await this.getAllChildLocations(locationCode);
    const locationCodes = [
      locationCode,
      ...allChildren.map((c) => c.location_code),
    ];

    // Sum inventory quantities across all locations
    const result = await this.inventoryLotModel
      .aggregate([
        {
          $match: {
            storage_location: { $in: locationCodes },
            status: { $in: ['Accepted', 'Available', 'In Use'] },
          },
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$quantity' },
          },
        },
      ])
      .exec();

    return result.length > 0
      ? ((result[0] as unknown as Record<string, unknown>)
          .totalQuantity as number)
      : 0;
  }

  /**
   * Update notes for a location (add notes directly on bin level)
   * @param locationCode - Location code
   * @param notes - Notes to add
   */
  async updateLocationNotes(
    locationCode: string,
    notes: string,
  ): Promise<WarehouseLocation> {
    const location = await this.locationModel
      .findOneAndUpdate(
        { location_code: locationCode },
        { notes, modified_date: new Date() },
        { new: true },
      )
      .exec();

    if (!location) {
      throw new NotFoundException(`Location '${locationCode}' not found`);
    }

    this.logger.log(`Updated notes for location: ${locationCode}`);
    return location;
  }

  /**
   * Get location details with current inventory snapshot
   * @param locationCode - Location code
   */
  async getLocationDetails(
    locationCode: string,
  ): Promise<Record<string, unknown>> {
    const location = await this.locationModel
      .findOne({ location_code: locationCode })
      .lean()
      .exec();

    if (!location) {
      throw new NotFoundException(`Location '${locationCode}' not found`);
    }

    const inventoryCount = await this.getLocationInventoryCount(locationCode);
    const capacity = (location as unknown as Record<string, unknown>)[
      'capacity'
    ] as number | undefined;
    const capacityPercentage =
      capacity && capacity > 0
        ? Math.round((inventoryCount / capacity) * 100)
        : undefined;

    return {
      ...location,
      current_inventory: inventoryCount,
      capacity_percentage: capacityPercentage,
    };
  }

  /**
   * Internal: Build location node with children recursively
   */
  private async buildLocationNode(
    location: WarehouseLocationDocument,
  ): Promise<LocationNode> {
    const children = await this.locationModel
      .find({ parent_code: location.location_code, is_active: true })
      .lean()
      .exec();

    const childNodes: LocationNode[] = [];
    for (const child of children as WarehouseLocationDocument[]) {
      const childNode = await this.buildLocationNode(child);
      childNodes.push(childNode);
    }

    // Get inventory count for this location
    const quantity = await this.getLocationInventoryCount(
      location.location_code,
    );

    return {
      location_code: location.location_code,
      location_name: location.location_name,
      level: location.level,
      quantity,
      capacity: location.capacity,
      is_active: location.is_active,
      children: childNodes,
      notes: location.notes,
    };
  }

  /**
   * Internal: Get all child locations recursively
   */
  private async getAllChildLocations(
    parentCode: string,
  ): Promise<WarehouseLocationDocument[]> {
    const children = await this.locationModel
      .find({ parent_code: parentCode })
      .lean()
      .exec();

    let allChildren: WarehouseLocationDocument[] = [
      ...(children as WarehouseLocationDocument[]),
    ];

    for (const child of children as WarehouseLocationDocument[]) {
      const grandchildren = await this.getAllChildLocations(
        child.location_code,
      );
      allChildren = [...allChildren, ...grandchildren];
    }

    return allChildren;
  }

  /**
   * Initialize example warehouse hierarchy (for testing)
   */
  async initializeExampleHierarchy(): Promise<void> {
    const existingCount = await this.locationModel.countDocuments().exec();
    if (existingCount > 0) {
      this.logger.log(
        'Warehouse locations already exist, skipping initialization',
      );
      return;
    }

    this.logger.log('Initializing example warehouse hierarchy');

    const locations = [
      // Warehouse
      {
        location_code: 'WH001',
        location_name: 'Main Warehouse',
        level: LocationLevel.WAREHOUSE,
        capacity: 10000,
        is_active: true,
      },

      // Zones
      {
        location_code: 'Z001',
        location_name: 'Zone A',
        level: LocationLevel.ZONE,
        parent_code: 'WH001',
        is_active: true,
      },
      {
        location_code: 'Z002',
        location_name: 'Zone B',
        level: LocationLevel.ZONE,
        parent_code: 'WH001',
        is_active: true,
      },

      // Shelves
      {
        location_code: 'S001',
        location_name: 'Shelf A1',
        level: LocationLevel.SHELF,
        parent_code: 'Z001',
        capacity: 2000,
        is_active: true,
      },
      {
        location_code: 'S002',
        location_name: 'Shelf A2',
        level: LocationLevel.SHELF,
        parent_code: 'Z001',
        capacity: 2000,
        is_active: true,
      },
      {
        location_code: 'S003',
        location_name: 'Shelf B1',
        level: LocationLevel.SHELF,
        parent_code: 'Z002',
        capacity: 2000,
        is_active: true,
      },

      // Bins
      {
        location_code: 'B001',
        location_name: 'Bin A1-01',
        level: LocationLevel.BIN,
        parent_code: 'S001',
        capacity: 500,
        is_active: true,
      },
      {
        location_code: 'B002',
        location_name: 'Bin A1-02',
        level: LocationLevel.BIN,
        parent_code: 'S001',
        capacity: 500,
        is_active: true,
      },
      {
        location_code: 'B003',
        location_name: 'Bin A2-01',
        level: LocationLevel.BIN,
        parent_code: 'S002',
        capacity: 500,
        is_active: true,
      },
      {
        location_code: 'B004',
        location_name: 'Bin B1-01',
        level: LocationLevel.BIN,
        parent_code: 'S003',
        capacity: 500,
        is_active: true,
      },
    ];

    await this.locationModel.insertMany(locations);
    this.logger.log('Example warehouse hierarchy initialized successfully');
  }
}
