import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateInventoryAuditReportDto } from './dto/create-inventory-audit-report.dto';
import { QueryInventoryAuditReportDto } from './dto/query-inventory-audit-report.dto';
import { InventoryAuditReportRepository } from './inventory-audit-report.repository';
import { InventoryAuditReportStatus } from '../schemas/inventory-audit-report.schema';
import {
  InventoryAuditReportRenderer,
  RenderInventoryAuditReportInput,
} from './pdf/inventory-audit-report.renderer';
import {
  SignatureResult,
  SignatureService,
} from './signature/signature.service';
import { InventoryAuditReportStorageService } from './storage/inventory-audit-report-storage.service';
import { RedisIdService } from '../redis-id/redis-id.service';

export interface RequesterContext {
  actor: string;
  role?: string;
}

@Injectable()
export class InventoryAuditReportService {
  constructor(
    private readonly repo: InventoryAuditReportRepository,
    private readonly renderer: InventoryAuditReportRenderer,
    private readonly signatureService: SignatureService,
    private readonly storageService: InventoryAuditReportStorageService,
    private readonly redisIdService: RedisIdService,
  ) {}

  async create(
    dto: CreateInventoryAuditReportDto,
    requester: RequesterContext,
  ) {
    const periodFrom = new Date(dto.period_from);
    const periodTo = new Date(dto.period_to);

    if (
      Number.isNaN(periodFrom.getTime()) ||
      Number.isNaN(periodTo.getTime())
    ) {
      throw new BadRequestException('period_from/period_to is invalid');
    }

    if (periodFrom > periodTo) {
      throw new BadRequestException('period_from must be before period_to');
    }

    const reportId = await this.redisIdService.nextId('RPT');
    const reportTemplateCode = dto.report_template_code ?? 'STATUTORY_V1';

    const draft = await this.repo.createDraft({
      report_id: reportId,
      period_from: periodFrom,
      period_to: periodTo,
      scope_warehouse_ids: dto.scope_warehouse_ids ?? [],
      report_template_code: reportTemplateCode,
      status: InventoryAuditReportStatus.PENDING,
      requested_by: requester.actor,
      approved_by: dto.approved_by,
      note: dto.note,
    });
    const requestedAt =
      (draft.get('created_date') as Date | undefined) ?? new Date();

    await this.repo.markProcessing(reportId);

    try {
      const items = await this.repo.getSnapshotItems({
        periodTo,
        warehouseIds: dto.scope_warehouse_ids,
        includeZeroBalance: dto.include_zero_balance,
      });

      const summaryTotalItems = items.length;
      const summaryTotalQuantity = items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      // Tam thoi su dung gia tri ton theo quantity cho phase 2-4; se thay the boi cost policy o phase tiep theo.
      const summaryTotalValue = summaryTotalQuantity;

      const pdfBuffer = await this.renderPdf({
        reportId,
        periodFrom,
        periodTo,
        templateCode: reportTemplateCode,
        generatedBy: requester.actor,
        approvedBy: dto.approved_by,
        generatedAt: new Date(),
        summaryTotalItems,
        summaryTotalQuantity,
        summaryTotalValue,
        items,
      });

      const signature = this.signatureService.signPdf(pdfBuffer);
      // Store the canonical PDF buffer only — signature metadata is persisted
      // in the database (file_sha256, signature_provider, etc.).
      // Appending extra bytes after %%EOF corrupts the PDF structure.
      const stored = await this.storageService.saveReport(
        reportId,
        pdfBuffer,
      );

      const ready = await this.repo.markReady(reportId, {
        summary_total_items: summaryTotalItems,
        summary_total_quantity: summaryTotalQuantity,
        summary_total_value: summaryTotalValue,
        file_storage_key: stored.file_storage_key,
        file_sha256: signature.fileSha256,
        file_size_bytes: stored.file_size_bytes,
        pdf_version: '1.0',
        signed_at: signature.signedAt,
        signature_provider: signature.signatureProvider,
        signature_serial_number: signature.signatureSerialNumber,
        signature_valid_from: signature.signatureValidFrom,
        signature_valid_to: signature.signatureValidTo,
        approved_by: dto.approved_by,
      });

      return {
        report_id: ready?.report_id ?? draft.report_id,
        status: ready?.status ?? InventoryAuditReportStatus.READY,
        requested_by: requester.actor,
        requested_at: requestedAt,
      };
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : 'Unknown report generation error';
      await this.repo.markFailed(reportId, reason);

      return {
        report_id: reportId,
        status: InventoryAuditReportStatus.FAILED,
        requested_by: requester.actor,
        requested_at: requestedAt,
        failure_reason: reason,
      };
    }
  }

  async findAll(query: QueryInventoryAuditReportDto) {
    return this.repo.findAll(
      {
        status: query.status,
        requested_by: query.requested_by,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
      {
        page: query.page,
        limit: query.limit,
      },
    );
  }

  async findOne(reportId: string) {
    const report = await this.repo.findByReportId(reportId);
    if (!report) {
      throw new NotFoundException(
        `Inventory audit report ${reportId} was not found`,
      );
    }

    return report;
  }

  async download(reportId: string) {
    const report = await this.findOne(reportId);
    if (report.status !== InventoryAuditReportStatus.READY) {
      throw new BadRequestException('Report is not ready for download');
    }

    if (!report.file_storage_key) {
      throw new NotFoundException('Report file storage key is missing');
    }

    const fileBuffer = await this.storageService.readReport(
      report.file_storage_key,
    );

    return {
      report,
      fileBuffer,
      fileName: `${report.report_id}.pdf`,
    };
  }

  private renderPdf(input: RenderInventoryAuditReportInput) {
    return this.renderer.render(input);
  }

  private attachSignatureFooter(
    pdfBuffer: Buffer,
    signature: SignatureResult,
  ): Buffer {
    // Keep the canonical PDF content and append audit metadata sidecar bytes.
    const footer = Buffer.from(
      `\n%%SIGNATURE_META%%\nprovider=${signature.signatureProvider}\nsha256=${signature.fileSha256}\nsignature=${signature.signature}\nsigned_at=${signature.signedAt.toISOString()}\n`,
      'utf-8',
    );

    return Buffer.concat([pdfBuffer, footer]);
  }
}
