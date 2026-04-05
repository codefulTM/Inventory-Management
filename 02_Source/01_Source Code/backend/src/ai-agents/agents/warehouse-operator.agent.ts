import { Injectable, BadRequestException } from '@nestjs/common';
import {
  CreateInventoryLotDto,
  InventoryLotResponseDto,
  UpdateInventoryLotDto,
} from '../../inventory-lot/inventory-lot.dto';
import { InventoryLotService } from '../../inventory-lot/inventory-lot.service';
import { AgentLlmService } from '../services/agent-llm.service';
import type {
  AgentHandlerInput,
  AgentHandlerOutput,
  AgentProfile,
} from '../ai-agents.types';

@Injectable()
export class WarehouseOperatorAgent {
  private readonly profile: AgentProfile = {
    name: 'Warehouse Operator',
    description: 'Thực hiện thao tác kho gồm tạo lô, sinh barcode, và gán vị trí lưu trữ.',
    instructions: [
      'Chỉ trả lời các yêu cầu liên quan thao tác kho.',
      'Nếu thiếu thông tin để thao tác, yêu cầu người dùng bổ sung rõ ràng.',
      'Trả lời tiếng Việt tự nhiên, ngắn gọn và chính xác.',
    ],
    model: 'gemini-2.5-flash',
    tools: [
      'InventoryLotService.create',
      'InventoryLotService.findById',
      'InventoryLotService.update',
    ],
  };

  constructor(
    private readonly inventoryLotService: InventoryLotService,
    private readonly agentLlmService: AgentLlmService,
  ) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    try {
      const action = (input.action || '').toLowerCase();

      if (action === 'create_lot') {
        const output = await this.createLot(input.payload ?? {});
        return this.withAssistantReply(input.query, output);
      }

      if (action === 'generate_barcode') {
        const output = this.generateBarcode(input.payload ?? {});
        return this.withAssistantReply(input.query, output);
      }

      if (action === 'assign_warehouse') {
        const output = await this.assignWarehouse(input.payload ?? {});
        return this.withAssistantReply(input.query, output);
      }

      if (!this.isWarehouseDomainQuery(input.query, action)) {
        return {
          status: 'needs_input',
          message:
            'Warehouse Operator only handles create_lot, generate_barcode, and assign_warehouse requests.',
          assistant_reply:
            'Tôi chỉ hỗ trợ nghiệp vụ kho: tạo lô, sinh barcode, và gán vị trí lưu trữ. Bạn có thể nêu rõ thao tác cần thực hiện.',
          agent_profile: this.profile,
          data: {
            supportedActions: [
              'create_lot',
              'generate_barcode',
              'assign_warehouse',
            ],
          },
        };
      }

      return {
        status: 'needs_input',
        message:
          'Warehouse Operator supports actions: create_lot, generate_barcode, assign_warehouse.',
        assistant_reply:
          'Bạn muốn thao tác kho nào? Vui lòng chọn một trong các hành động: create_lot, generate_barcode, hoặc assign_warehouse.',
        agent_profile: this.profile,
        data: {
          expectedActions: ['create_lot', 'generate_barcode', 'assign_warehouse'],
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[WarehouseOperatorAgent] Error:`, errorMsg);
      
      return {
        status: 'error',
        message: `Lỗi xử lý kho: ${errorMsg}`,
        assistant_reply: `Xin lỗi, tôi gặp lỗi: ${errorMsg}. Vui lòng thử lại.`,
        agent_profile: this.profile,
        data: {},
      };
    }
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
        assistant_reply: `Để tạo lô mới, bạn cần cung cấp thêm các trường còn thiếu: ${missing.join(', ')}.`,
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
        assistant_reply:
          'Để gán kho, vui lòng cung cấp đủ lot_id và storage_location.',
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

  private isWarehouseDomainQuery(query: string, action: string): boolean {
    const normalized = (query || '')
      .toLowerCase()
      .replace(/[!?.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (['create_lot', 'generate_barcode', 'assign_warehouse'].includes(action)) {
      return true;
    }

    const keywords = [
      'nhap kho',
      'nhập kho',
      'gan kho',
      'gán kho',
      'barcode',
      'create lot',
      'tao lo',
      'tạo lô',
      'storage location',
      'warehouse',
    ];

    return keywords.some((keyword) => normalized.includes(keyword));
  }

  private async withAssistantReply(
    userQuery: string,
    output: AgentHandlerOutput,
  ): Promise<AgentHandlerOutput> {
    if (output.status !== 'ok') {
      return {
        ...output,
        agent_profile: this.profile,
      };
    }

    const llmReply = await this.agentLlmService.generateReply(
      this.profile,
      userQuery,
      output.data || {},
    );

    return {
      ...output,
      assistant_reply:
        llmReply ||
        'Tôi đã xử lý xong yêu cầu thao tác kho. Bạn có thể kiểm tra chi tiết trong dữ liệu trả về.',
      agent_profile: this.profile,
    };
  }
}
