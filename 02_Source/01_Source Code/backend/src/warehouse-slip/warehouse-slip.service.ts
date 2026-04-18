import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { WarehouseSlipRepository } from './warehouse-slip.repository';
import { CreateWarehouseSlipDto } from './dto/create-warehouse-slip.dto';

@Injectable()
export class WarehouseSlipService {
  constructor(private readonly repo: WarehouseSlipRepository) {}

  private generateSlipNumber() {
    const ts = new Date().toISOString().replace(/[^0-9]/g, '');
    return `SLIP-${ts}-${uuidv4().slice(0, 8)}`;
  }

  async create(dto: CreateWarehouseSlipDto, requester: { actor: string }) {
    // validate warehouse
    const warehouse = await this.repo.findWarehouseById(dto.warehouse_id);
    if (!warehouse) {
      throw new BadRequestException('warehouse_id does not exist');
    }

    const total_quantity = Array.isArray(dto.lines)
      ? dto.lines.reduce((s, l: any) => s + Number(l.quantity || 0), 0)
      : 0;

    const payload: any = {
      slip_id: uuidv4(),
      slip_number: this.generateSlipNumber(),
      type: dto.type,
      warehouse_id: dto.warehouse_id,
      reference_number: dto.reference_number,
      notes: dto.notes,
      lines: dto.lines || [],
      attachments: dto.attachments || [],
      total_quantity,
      total_value: 0,
      created_by: requester.actor,
      status: dto.status ?? 'PENDING',
    };

    return this.repo.create(payload);
  }

  async getAll(filters: any, paging: any, requester: { actor: string }) {
    return this.repo.findAll(filters, paging);
  }

  async getOne(slipId: string, requester: { actor: string }) {
    const doc = await this.repo.findOneBySlipId(slipId);
    if (!doc) throw new NotFoundException('Warehouse slip not found');
    return doc;
  }

  async addAttachment(
    slipId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      filename: string;
    },
    requester: { actor: string },
    source?: string,
  ) {
    // Build attachment metadata
    const attachment = {
      file_id: uuidv4(),
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
      url: `/uploads/warehouse-slips/${file.filename}`,
      storage_source: 'local',
      uploaded_by: requester.actor,
      uploaded_at: new Date(),
    };

    return this.repo.appendAttachment(slipId, attachment);
  }
}
