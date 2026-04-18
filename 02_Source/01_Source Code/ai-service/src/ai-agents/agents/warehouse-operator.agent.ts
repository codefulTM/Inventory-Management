import { Injectable, BadRequestException } from '@nestjs/common';
import { BackendDataService } from '../../backend-client/backend-data.service';
import { AgentLlmService } from '../services/agent-llm.service';
import type { AgentHandlerInput, AgentHandlerOutput, AgentProfile } from '../ai-agents.types';

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
      'BackendDataService.createInventoryLot',
      'BackendDataService.findInventoryLotById',
      'BackendDataService.updateInventoryLot',
    ],
  };

  constructor(
    private readonly backendDataService: BackendDataService,
    private readonly agentLlmService: AgentLlmService,
  ) {}

  async handle(input: AgentHandlerInput): Promise<AgentHandlerOutput> {
    try {
      const action = (input.action || '').toLowerCase();

      if (action === 'create_lot') return this.withAssistantReply(input.query, await this.createLot(input.payload ?? {}));
      if (action === 'generate_barcode') return this.withAssistantReply(input.query, this.generateBarcode(input.payload ?? {}));
      if (action === 'assign_warehouse') return this.withAssistantReply(input.query, await this.assignWarehouse(input.payload ?? {}));

      if (!this.isWarehouseDomainQuery(input.query, action)) {
        return {
          status: 'needs_input',
          message: 'Warehouse Operator only handles create_lot, generate_barcode, and assign_warehouse requests.',
          assistant_reply: 'Tôi chỉ hỗ trợ nghiệp vụ kho: tạo lô, sinh barcode, và gán vị trí lưu trữ. Bạn có thể nêu rõ thao tác cần thực hiện.',
          agent_profile: this.profile,
          data: { supportedActions: ['create_lot', 'generate_barcode', 'assign_warehouse'] },
        };
      }

      return {
        status: 'needs_input',
        message: 'Warehouse Operator supports actions: create_lot, generate_barcode, assign_warehouse.',
        assistant_reply: 'Bạn muốn thao tác kho nào? Vui lòng chọn một trong các hành động: create_lot, generate_barcode, hoặc assign_warehouse.',
        agent_profile: this.profile,
        data: { expectedActions: ['create_lot', 'generate_barcode', 'assign_warehouse'] },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { status: 'error', message: `Lỗi xử lý kho: ${errorMsg}`, assistant_reply: `Xin lỗi, tôi gặp lỗi: ${errorMsg}. Vui lòng thử lại.`, agent_profile: this.profile, data: {} };
    }
  }

  private async createLot(payload: Record<string, unknown>): Promise<AgentHandlerOutput> {
    const required = ['lot_id', 'material_id', 'manufacturer_name', 'manufacturer_lot', 'received_date', 'expiration_date', 'status', 'quantity', 'unit_of_measure'];
    const missing = required.filter((f) => payload[f] === undefined);
    if (missing.length > 0) {
      return { status: 'needs_input', message: 'Missing required fields for lot creation.', assistant_reply: `Để tạo lô mới, bạn cần cung cấp thêm các trường còn thiếu: ${missing.join(', ')}.`, data: { missing } };
    }
    const created = await this.backendDataService.createInventoryLot(payload);
    return { status: 'ok', message: 'Inventory lot created successfully.', data: { lot: created } };
  }

  private generateBarcode(payload: Record<string, unknown>): AgentHandlerOutput {
    const lotId = typeof payload.lot_id === 'string' ? payload.lot_id.trim() : '';
    if (!lotId) throw new BadRequestException('payload.lot_id is required for barcode generation');
    const normalized = lotId.toUpperCase();
    const barcodeValue = `LOT:${normalized}`;
    return { status: 'ok', message: 'Barcode payload generated.', data: { lot_id: normalized, barcode_format: 'CODE128', barcode_value: barcodeValue, qr_value: barcodeValue } };
  }

  private async assignWarehouse(payload: Record<string, unknown>): Promise<AgentHandlerOutput> {
    const lotId = typeof payload.lot_id === 'string' ? payload.lot_id.trim() : '';
    const storageLocation = typeof payload.storage_location === 'string' ? payload.storage_location.trim() : '';
    if (!lotId || !storageLocation) {
      return { status: 'needs_input', message: 'lot_id and storage_location are required.', assistant_reply: 'Để gán kho, vui lòng cung cấp đủ lot_id và storage_location.', data: { expectedFields: ['lot_id', 'storage_location'] } };
    }
    const existing = await this.backendDataService.findInventoryLotById(lotId) as Record<string, unknown>;
    const updated = await this.backendDataService.updateInventoryLot(lotId, { ...existing, storage_location: storageLocation });
    return { status: 'ok', message: 'Warehouse location assigned successfully.', data: { lot: updated } };
  }

  private isWarehouseDomainQuery(query: string, action: string): boolean {
    if (['create_lot', 'generate_barcode', 'assign_warehouse'].includes(action)) return true;
    const normalized = (query || '').toLowerCase().replace(/[!?.,]/g, ' ').replace(/\s+/g, ' ').trim();
    const keywords = ['nhap kho', 'nhập kho', 'gan kho', 'gán kho', 'barcode', 'create lot', 'tao lo', 'tạo lô', 'storage location', 'warehouse'];
    return keywords.some((k) => normalized.includes(k));
  }

  private async withAssistantReply(userQuery: string, output: AgentHandlerOutput): Promise<AgentHandlerOutput> {
    if (output.status !== 'ok') return { ...output, agent_profile: this.profile };
    const llmReply = await this.agentLlmService.generateReply(this.profile, userQuery, output.data || {});
    return { ...output, assistant_reply: llmReply || 'Tôi đã xử lý xong yêu cầu thao tác kho. Bạn có thể kiểm tra chi tiết trong dữ liệu trả về.', agent_profile: this.profile };
  }
}
