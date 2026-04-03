import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InventoryLot,
  InventoryLotDocument,
} from '../schemas/inventory-lot.schema';
import bwipjs from 'bwip-js';

export interface BarcodeData {
  _id?: string;
  lot_id: string;
  barcode_value: string;
  format: string;
  created_at?: Date;
}

@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);

  constructor(
    @InjectModel(InventoryLot.name)
    private inventoryLotModel: Model<InventoryLotDocument>,
  ) {}

  /**
   * Generate barcode for a lot and save barcode data
   */
  async generateBarcodeForLot(
    lot_id: string,
    format: 'code128' | 'ean13' | 'qrcode' = 'code128',
  ): Promise<BarcodeData> {
    const lot = await this.inventoryLotModel.findOne({ lot_id }).lean();
    if (!lot) throw new Error(`Lot ${lot_id} not found`);

    const barcodeValue = this._generateBarcodeValue(lot_id);

    this.logger.log(`Generated barcode for lot: ${lot_id}`);

    return {
      lot_id,
      barcode_value: barcodeValue,
      format,
      created_at: new Date(),
    };
  }

  /**
   * Generate barcode image (PNG/SVG/PDF)
   * US40: Download barcode
   */
  async generateBarcodeImage(
    lot_id: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _format: 'png' | 'svg' = 'png',
    barcodeFormat: 'code128' | 'ean13' | 'qrcode' = 'code128',
  ): Promise<Buffer> {
    const barcodeValue = this._generateBarcodeValue(lot_id);

    try {
      // Generate barcode using bwip-js
      const png = await bwipjs.toBuffer({
        bcid: barcodeFormat,
        text: barcodeValue,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });

      return png;
    } catch (error) {
      this.logger.error('Barcode generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate batch of barcodes
   * US40: Batch export
   */
  async generateBatchBarcodes(lot_ids: string[]): Promise<Buffer[]> {
    const barcodes: Buffer[] = [];

    for (const lot_id of lot_ids) {
      try {
        const barcode = await this.generateBarcodeImage(
          lot_id,
          'png',
          'code128',
        );
        barcodes.push(barcode);
      } catch (error) {
        this.logger.warn(
          `Failed to generate barcode for lot ${lot_id}:`,
          error,
        );
      }
    }

    return barcodes;
  }

  /**
   * Query lot information by barcode input
   * US41: Scan/input barcode to query
   */
  async queryByBarcode(
    barcodeInput: string,
  ): Promise<Record<string, unknown> | null> {
    // Extract lot_id from barcode value (assuming format: LOT-XXXXX or similar)
    const lot_id = this._extractLotIdFromBarcode(barcodeInput);

    const lot = await this.inventoryLotModel.findOne({ lot_id }).lean().exec();

    if (!lot) {
      this.logger.warn(`Barcode lookup failed for: ${barcodeInput}`);
      return null;
    }

    return {
      lot_id: lot.lot_id,
      material_id: lot.material_id,
      quantity: lot.quantity,
      unit: lot.unit_of_measure,
      status: lot.status,
      location: lot.storage_location,
      expiration_date: lot.expiration_date,
      received_date: lot.received_date,
    };
  }

  /**
   * Internal: Generate barcode value from lot_id
   */
  private _generateBarcodeValue(lot_id: string): string {
    // Simple barcode generation: LOT-XXXXX format
    return `LOT${lot_id.substring(lot_id.length - 8)}`;
  }

  /**
   * Internal: Extract lot_id from barcode input
   */
  private _extractLotIdFromBarcode(barcodeInput: string): string {
    // Remove LOT prefix and return the rest
    if (barcodeInput.startsWith('LOT')) {
      return barcodeInput.substring(3);
    }
    return barcodeInput;
  }
}
