import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { InventoryAuditReportSnapshotItem } from '../inventory-audit-report.repository';

type PdfDoc = InstanceType<typeof PDFDocument>;

export interface RenderInventoryAuditReportInput {
  reportId: string;
  periodFrom: Date;
  periodTo: Date;
  templateCode: string;
  generatedBy: string;
  approvedBy?: string;
  generatedAt: Date;
  summaryTotalItems: number;
  summaryTotalQuantity: number;
  summaryTotalValue: number;
  items: InventoryAuditReportSnapshotItem[];
}

@Injectable()
export class InventoryAuditReportRenderer {
  async render(input: RenderInventoryAuditReportInput): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `Bao cao kiem ke ${input.reportId}`,
        Author: input.generatedBy,
        Subject: 'Bao cao kiem ke hang ton kho',
      },
    });

    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.from(chunk));
      });
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderHeader(doc, input);
      this.renderSummary(doc, input);
      this.renderTable(doc, input.items);

      doc.moveDown(2);
      doc
        .fontSize(9)
        .text(
          `Nguoi lap bao cao: ${input.generatedBy} | Nguoi phe duyet: ${input.approvedBy ?? 'N/A'}`,
        );
      doc.fontSize(9).text('Tai lieu da duoc dong dau so o metadata he thong.');

      doc.end();
    });
  }

  private renderHeader(doc: PdfDoc, input: RenderInventoryAuditReportInput) {
    doc.fontSize(16).text('BAO CAO KIEM KE HANG TON KHO', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Ma bao cao: ${input.reportId}`);
    doc
      .fontSize(10)
      .text(
        `Ky bao cao: ${input.periodFrom.toISOString().slice(0, 10)} den ${input.periodTo.toISOString().slice(0, 10)}`,
      );
    doc.fontSize(10).text(`Mau bieu: ${input.templateCode}`);
    doc
      .fontSize(10)
      .text(
        `Thoi diem xuat: ${input.generatedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC`,
      );
    doc.moveDown(1);
  }

  private renderSummary(doc: PdfDoc, input: RenderInventoryAuditReportInput) {
    doc.fontSize(11).text('Tong hop:');
    doc
      .fontSize(10)
      .text(`- So dong bao cao: ${input.summaryTotalItems}`)
      .text(`- Tong so luong ton: ${input.summaryTotalQuantity}`)
      .text(`- Tong gia tri ton (tam tinh): ${input.summaryTotalValue}`);
    doc.moveDown(1);
  }

  private renderTable(doc: PdfDoc, items: InventoryAuditReportSnapshotItem[]) {
    doc.fontSize(11).text('Chi tiet kiem ke:');
    doc.moveDown(0.5);

    const maxRows = 120;
    const rows = items.slice(0, maxRows);

    doc
      .fontSize(9)
      .text('LOT', 40, doc.y, { continued: true, width: 70 })
      .text('MATERIAL', { continued: true, width: 70 })
      .text('KHO', { continued: true, width: 55 })
      .text('VI TRI', { continued: true, width: 65 })
      .text('SO LUONG', { continued: true, width: 65, align: 'right' })
      .text('DON VI', { continued: true, width: 45 })
      .text('TRANG THAI', { width: 80 });

    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();

    for (const row of rows) {
      const y = doc.y + 3;
      doc
        .fontSize(8)
        .text(row.lot_id, 40, y, { continued: true, width: 70 })
        .text(row.material_id, { continued: true, width: 70 })
        .text(row.warehouse_id, { continued: true, width: 55 })
        .text(row.storage_location, { continued: true, width: 65 })
        .text(String(row.quantity), {
          continued: true,
          width: 65,
          align: 'right',
        })
        .text(row.unit_of_measure, { continued: true, width: 45 })
        .text(row.status, { width: 80 });

      if (doc.y > 760) {
        doc.addPage();
      }
    }

    if (items.length > maxRows) {
      doc
        .moveDown(0.5)
        .fontSize(9)
        .text(
          `Ghi chu: Bao cao hien thi ${maxRows}/${items.length} dong. Vui long su dung API chi tiet de trich xuat day du.`,
        );
    }
  }
}
