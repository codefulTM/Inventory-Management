import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryAuditReportService } from './inventory-audit-report.service';
import { InventoryAuditReportRepository } from './inventory-audit-report.repository';
import { InventoryAuditReportRenderer } from './pdf/inventory-audit-report.renderer';
import { SignatureService } from './signature/signature.service';
import { InventoryAuditReportStorageService } from './storage/inventory-audit-report-storage.service';
import { InventoryAuditReportStatus } from '../schemas/inventory-audit-report.schema';
import { CreateInventoryAuditReportDto } from './dto/create-inventory-audit-report.dto';

function makeDto(
  overrides: Partial<CreateInventoryAuditReportDto> = {},
): CreateInventoryAuditReportDto {
  return {
    period_from: '2026-04-01T00:00:00.000Z',
    period_to: '2026-04-04T00:00:00.000Z',
    scope_warehouse_ids: ['WH-HN-01'],
    include_zero_balance: false,
    report_template_code: 'STATUTORY_V1',
    signer_profile_id: 'default',
    note: 'Bao cao kiem ke thang 04',
    approved_by: 'manager-approver',
    ...overrides,
  };
}

describe('InventoryAuditReportService', () => {
  let service: InventoryAuditReportService;

  let repo: jest.Mocked<Partial<InventoryAuditReportRepository>>;
  let renderer: jest.Mocked<Partial<InventoryAuditReportRenderer>>;
  let signatureService: jest.Mocked<Partial<SignatureService>>;
  let storageService: jest.Mocked<Partial<InventoryAuditReportStorageService>>;

  beforeEach(() => {
    repo = {
      createDraft: jest.fn().mockResolvedValue({
        report_id: '11111111-1111-4111-8111-111111111111',
        get: jest.fn().mockReturnValue(new Date('2026-04-04T10:00:00.000Z')),
      }),
      markProcessing: jest.fn().mockResolvedValue({}),
      getSnapshotItems: jest.fn().mockResolvedValue([
        {
          lot_id: 'LOT-001',
          material_id: 'MAT-001',
          material_name: 'Vitamin D3',
          warehouse_id: 'WH-HN-01',
          warehouse_name: 'Kho Ha Noi',
          storage_location: 'COLD-STORE-A1',
          quantity: 100,
          unit_of_measure: 'capsule',
          status: 'Accepted',
        },
      ]),
      markReady: jest.fn().mockResolvedValue({
        report_id: '11111111-1111-4111-8111-111111111111',
        status: InventoryAuditReportStatus.READY,
      }),
      markFailed: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findByReportId: jest.fn(),
    };

    renderer = {
      render: jest
        .fn()
        .mockResolvedValue(Buffer.from('%PDF-1.4\nUS16 MOCK PDF\n')),
    };

    signatureService = {
      signPdf: jest.fn().mockReturnValue({
        fileSha256: 'abc123',
        signature: 'signature-base64',
        signatureProvider: 'HMAC_SHA256_FALLBACK',
        signatureSerialNumber: 'serial-001',
        signedAt: new Date('2026-04-04T10:01:00.000Z'),
      }),
    };

    storageService = {
      saveReport: jest.fn().mockResolvedValue({
        file_storage_key: '11111111-1111-4111-8111-111111111111.pdf',
        absolute_path: 'tmp/report.pdf',
        file_size_bytes: 512,
      }),
      readReport: jest.fn().mockResolvedValue(Buffer.from('PDF_BINARY')),
    };

    service = new InventoryAuditReportService(
      repo as unknown as InventoryAuditReportRepository,
      renderer as unknown as InventoryAuditReportRenderer,
      signatureService as unknown as SignatureService,
      storageService as unknown as InventoryAuditReportStorageService,
      { nextId: jest.fn().mockResolvedValue('RPT-1') } as any,
    );
  });

  it('throws BadRequestException when period range is invalid', async () => {
    await expect(
      service.create(
        makeDto({
          period_from: '2026-05-01T00:00:00.000Z',
          period_to: '2026-04-01T00:00:00.000Z',
        }),
        { actor: 'manager01', role: 'Manager' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates report successfully and returns READY status', async () => {
    const result = await service.create(makeDto(), {
      actor: 'manager01',
      role: 'Manager',
    });

    expect(repo.createDraft).toHaveBeenCalledTimes(1);
    expect(repo.markProcessing).toHaveBeenCalledTimes(1);
    expect(repo.getSnapshotItems).toHaveBeenCalledTimes(1);
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(signatureService.signPdf).toHaveBeenCalledTimes(1);
    expect(storageService.saveReport).toHaveBeenCalledTimes(1);
    expect(repo.markReady).toHaveBeenCalledTimes(1);
    expect(repo.markFailed).not.toHaveBeenCalled();

    expect(result).toEqual(
      expect.objectContaining({
        report_id: '11111111-1111-4111-8111-111111111111',
        status: InventoryAuditReportStatus.READY,
        requested_by: 'manager01',
      }),
    );
  });

  it('marks report FAILED when generation pipeline throws', async () => {
    (renderer.render as jest.Mock).mockRejectedValueOnce(
      new Error('Render failed'),
    );

    const result = await service.create(makeDto(), {
      actor: 'manager01',
      role: 'Manager',
    });

    expect(repo.markFailed).toHaveBeenCalledWith(
      expect.any(String),
      'Render failed',
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: InventoryAuditReportStatus.FAILED,
        failure_reason: 'Render failed',
      }),
    );
  });

  it('findOne throws NotFoundException when report does not exist', async () => {
    (repo.findByReportId as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      service.findOne('11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('download throws BadRequestException when report is not READY', async () => {
    (repo.findByReportId as jest.Mock).mockResolvedValueOnce({
      report_id: '11111111-1111-4111-8111-111111111111',
      status: InventoryAuditReportStatus.PROCESSING,
      file_storage_key: 'report.pdf',
    });

    await expect(
      service.download('11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('download returns pdf buffer and filename when report is READY', async () => {
    (repo.findByReportId as jest.Mock).mockResolvedValueOnce({
      report_id: '11111111-1111-4111-8111-111111111111',
      status: InventoryAuditReportStatus.READY,
      file_storage_key: 'report.pdf',
    });

    const result = await service.download(
      '11111111-1111-4111-8111-111111111111',
    );

    expect(storageService.readReport).toHaveBeenCalledWith('report.pdf');
    expect(result.fileName).toBe('11111111-1111-4111-8111-111111111111.pdf');
    expect(Buffer.isBuffer(result.fileBuffer)).toBe(true);
  });

  it('findAll maps query to repository filters', async () => {
    await service.findAll({
      page: 1,
      limit: 20,
      status: InventoryAuditReportStatus.READY,
      requested_by: 'manager01',
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-30T00:00:00.000Z',
    });

    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        status: InventoryAuditReportStatus.READY,
        requested_by: 'manager01',
      }),
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
    );
  });
});
