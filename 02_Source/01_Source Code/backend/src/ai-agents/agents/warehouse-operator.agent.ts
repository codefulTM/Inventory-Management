import { Injectable, BadRequestException } from '@nestjs/common';
import {
  CreateInventoryLotDto,
  InventoryLotResponseDto,
  UpdateInventoryLotDto,
} from '../../inventory-lot/inventory-lot.dto';
import { InventoryLotService } from '../../inventory-lot/inventory-lot.service';
import { AgentHandlerInput, AgentHandlerOutput } from '../ai-agents.types';

@Injectable()
export class WarehouseOperatorAgent {
  constructor(private readonly inventoryLotService: InventoryLotService) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    const action = (input.action || '').toLowerCase();

    if (action === 'create_lot') {
      return this.createLot(input.payload ?? {});
    }

    if (action === 'generate_barcode') {
      return this.generateBarcode(input.payload ?? {});
    }

    if (action === 'assign_warehouse') {
      return this.assignWarehouse(input.payload ?? {});
    }

    return {
      status: 'needs_input',
      message:
        'Warehouse Operator supports actions: create_lot, generate_barcode, assign_warehouse.',
      data: {
        expectedActions: ['create_lot', 'generate_barcode', 'assign_warehouse'],
      },
    };
  }

  private async createLot(
    payload: Record<string, unknown>,
  ): Promise<AgentHandlerOutput> {
    const requiredFields = [
      'lot_id',
      'material_id',
      'manufacturer_name',
      'manufacturer_lot',
      'received_date',
      'expiration_date',
      'status',
      'quantity',
      'unit_of_measure',
    ];

    const missing = requiredFields.filter((f) => payload[f] === undefined);
    if (missing.length > 0) {
      return {
        status: 'needs_input',
        message: 'Missing required fields for lot creation.',
        data: { missing },
      };
    }

    const dto = payload as unknown as CreateInventoryLotDto;
    const created = await this.inventoryLotService.create(dto);

    return {
      status: 'ok',
      message: 'Inventory lot created successfully.',
      data: { lot: created },
    };
  }

  private generateBarcode(
    payload: Record<string, unknown>,
  ): AgentHandlerOutput {
    const lotId = this.toStringValue(payload.lot_id);
    if (!lotId) {
      throw new BadRequestException(
        'payload.lot_id is required for barcode generation',
      );
    }

    const normalized = lotId.toUpperCase();
    const barcodeValue = `LOT:${normalized}`;

    return {
      status: 'ok',
      message: 'Barcode payload generated.',
      data: {
        lot_id: normalized,
        barcode_format: 'CODE128',
        barcode_value: barcodeValue,
        qr_value: barcodeValue,
      },
    };
  }

  private async assignWarehouse(
    payload: Record<string, unknown>,
  ): Promise<AgentHandlerOutput> {
    const lotId = this.toStringValue(payload.lot_id);
    const storageLocation = this.toStringValue(payload.storage_location);

    if (!lotId || !storageLocation) {
      return {
        status: 'needs_input',
        message: 'lot_id and storage_location are required.',
        data: { expectedFields: ['lot_id', 'storage_location'] },
      };
    }

    const existing = await this.inventoryLotService.findById(lotId);
    const dto: UpdateInventoryLotDto = {
      material_id: existing.material_id,
      manufacturer_name: existing.manufacturer_name,
      manufacturer_lot: existing.manufacturer_lot,
      supplier_name: existing.supplier_name,
      received_date: existing.received_date,
      expiration_date: existing.expiration_date,
      in_use_expiration_date: existing.in_use_expiration_date,
      status: existing.status,
      quantity: existing.quantity,
      unit_of_measure: existing.unit_of_measure,
      storage_location: storageLocation,
      is_sample: existing.is_sample,
      parent_lot_id: existing.parent_lot_id,
      notes: existing.notes,
    };

    const updated: InventoryLotResponseDto =
      await this.inventoryLotService.update(lotId, dto);

    return {
      status: 'ok',
      message: 'Warehouse location assigned successfully.',
      data: { lot: updated },
    };
  }

  private toStringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}
