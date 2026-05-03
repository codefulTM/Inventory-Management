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

/**
 * Interface định nghĩa thông tin người thực hiện yêu cầu
 */
export interface RequesterContext {
  actor: string;  // Tên hoặc ID người thực hiện
  role?: string;  // Vai trò của người thực hiện
}

/**
 * Service xử lý nghiệp vụ báo cáo kiểm kê tồn kho
 * 
 * Quy trình tạo báo cáo:
 * 1. Validate dữ liệu đầu vào (khoảng thời gian, v.v.)
 * 2. Tạo draft báo cáo (trạng thái PENDING)
 * 3. Đánh dấu PROCESSING
 * 4. Lấy snapshot tồn kho từ DB
 * 5. Tính toán tổng hợp (số lượng, giá trị)
 * 6. Render báo cáo ra PDF
 * 7. Ký số PDF
 * 8. Lưu trữ file PDF
 * 9. Đánh dấu READY (hoặc FAILED nếu có lỗi)
 */
@Injectable()
export class InventoryAuditReportService {
  constructor(
    private readonly repo: InventoryAuditReportRepository,       // Truy vấn DB
    private readonly renderer: InventoryAuditReportRenderer,     // Tạo file PDF
    private readonly signatureService: SignatureService,        // Ký số PDF
    private readonly storageService: InventoryAuditReportStorageService, // Lưu trữ file
    private readonly redisIdService: RedisIdService,            // Sinh ID tự động (RPT-xxx)
  ) {}

  /**
   * Tạo mới một báo cáo kiểm kê tồn kho
   * Đây là quy trình phức tạp thực hiện nhiều bước trong try-catch
   * 
   * @param dto - Dữ liệu tạo báo cáo
   * @param requester - Thông tin người yêu cầu
   * @returns Thông tin báo cáo (thành công: READY, thất bại: FAILED kèm lý do)
   */
  async create(
    dto: CreateInventoryAuditReportDto,
    requester: RequesterContext,
  ) {
    // Chuyển đổi chuỗi ngày thành đối tượng Date
    const periodFrom = new Date(dto.period_from);
    const periodTo = new Date(dto.period_to);

    // Validate định dạng ngày
    if (
      Number.isNaN(periodFrom.getTime()) ||
      Number.isNaN(periodTo.getTime())
    ) {
      throw new BadRequestException('period_from/period_to is invalid');
    }

    // Validate: from phải trước to
    if (periodFrom > periodTo) {
      throw new BadRequestException('period_from must be before period_to');
    }

    // Sinh mã báo cáo tự động (RPT-xxx)
    const reportId = await this.redisIdService.nextId('RPT');
    const reportTemplateCode = dto.report_template_code ?? 'STATUTORY_V1';

    // Bước 1: Tạo draft báo cáo với trạng thái PENDING
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

    // Bước 2: Đánh dấu đang xử lý
    await this.repo.markProcessing(reportId);

    try {
      // Bước 3: Lấy snapshot tồn kho tại thời điểm periodTo
      const items = await this.repo.getSnapshotItems({
        periodTo,
        warehouseIds: dto.scope_warehouse_ids,
        includeZeroBalance: dto.include_zero_balance,
      });

      // Bước 4: Tính toán các chỉ số tổng hợp
      const summaryTotalItems = items.length; // Tổng số dòng báo cáo
      const summaryTotalQuantity = items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      // Tạm thời sử dụng giá trị tồn theo số lượng cho phase 2-4
      // Sẽ thay thế bằng cost policy ở phase tiếp theo
      const summaryTotalValue = summaryTotalQuantity;

      // Bước 5: Render báo cáo ra file PDF
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

      // Bước 6: Ký số file PDF
      const signature = this.signatureService.signPdf(pdfBuffer);
      
      // Lưu PDF gốc (không append thêm bytes để tránh hỏng cấu trúc PDF)
      // Metadata chữ ký được lưu riêng trong database
      const stored = await this.storageService.saveReport(
        reportId,
        pdfBuffer,
      );

      // Bước 7: Cập nhật trạng thái thành READY kèm thông tin file và chữ ký
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

      // Trả về thông tin báo cáo đã tạo thành công
      return {
        report_id: ready?.report_id ?? draft.report_id,
        status: ready?.status ?? InventoryAuditReportStatus.READY,
        requested_by: requester.actor,
        requested_at: requestedAt,
      };
    } catch (error) {
      // Xử lý lỗi: đánh dấu báo cáo FAILED kèm lý do
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

  /**
   * Lấy danh sách báo cáo kiểm kê có phân trang và lọc
   * @param query - Tham số query từ request (status, requested_by, from, to, page, limit)
   * @returns Danh sách báo cáo với thông tin phân trang
   */
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

  /**
   * Lấy chi tiết một báo cáo theo ID
   * @param reportId - Mã báo cáo cần tìm
   * @returns Thông tin chi tiết báo cáo
   * @throws NotFoundException nếu không tìm thấy
   */
  async findOne(reportId: string) {
    const report = await this.repo.findByReportId(reportId);
    if (!report) {
      throw new NotFoundException(
        `Inventory audit report ${reportId} was not found`,
      );
    }

    return report;
  }

  /**
   * Tải xuống file PDF của báo cáo
   * Chỉ cho phép tải khi báo cáo đã ở trạng thái READY
   * 
   * @param reportId - Mã báo cáo cần tải
   * @returns Object chứa report info, fileBuffer và fileName
   * @throws BadRequestException nếu báo cáo chưa sẵn sàng
   * @throws NotFoundException nếu không tìm thấy file_storage_key
   */
  async download(reportId: string) {
    const report = await this.findOne(reportId);
    
    // Kiểm tra trạng thái báo cáo
    if (report.status !== InventoryAuditReportStatus.READY) {
      throw new BadRequestException('Report is not ready for download');
    }

    // Kiểm tra xem có thông tin file không
    if (!report.file_storage_key) {
      throw new NotFoundException('Report file storage key is missing');
    }

    // Đọc file từ storage service
    const fileBuffer = await this.storageService.readReport(
      report.file_storage_key,
    );

    return {
      report,
      fileBuffer,
      fileName: `${report.report_id}.pdf`,
    };
  }

  /**
   * Gọi renderer để tạo file PDF từ dữ liệu báo cáo
   * @param input - Dữ liệu đầu vào cho việc render PDF
   * @returns Buffer chứa nội dung file PDF
   */
  private renderPdf(input: RenderInventoryAuditReportInput) {
    return this.renderer.render(input);
  }

  /**
   * (Không còn sử dụng) Phương thức cũ dùng để append metadata chữ ký vào cuối file PDF
   * Hiện tại chỉ lưu PDF gốc, metadata được lưu trong DB để tránh hỏng cấu trúc PDF
   * 
   * @param pdfBuffer - Buffer của file PDF gốc
   * @param signature - Thông tin chữ ký số
   * @returns Buffer mới với metadata được append
   */
  private attachSignatureFooter(
    pdfBuffer: Buffer,
    signature: SignatureResult,  ): Buffer {
    // Keep the canonical PDF content and append audit metadata sidecar bytes.
    const footer = Buffer.from(
      `\n%%SIGNATURE_META%%\nprovider=${signature.signatureProvider}\nsha256=${signature.fileSha256}\nsignature=${signature.signature}\nsigned_at=${signature.signedAt.toISOString()}\n`,
      'utf-8',
    );

    return Buffer.concat([pdfBuffer, footer]);
  }
}
