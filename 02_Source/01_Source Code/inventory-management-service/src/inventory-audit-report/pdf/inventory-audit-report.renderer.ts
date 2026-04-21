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

      // Footer — inline after table, no fixed y (avoids spurious new pages)
      doc.moveDown(1.5).fontSize(8);
      const footerY = doc.y;
      doc.text(`Nguoi lap bao cao: ${input.generatedBy}`, 40, footerY, {
        width: 250,
        lineBreak: false,
      });
      doc.text(`Nguoi phe duyet: ${input.approvedBy ?? 'N/A'}`, 300, footerY, {
        width: 255,
        lineBreak: false,
        align: 'right',
      });
      doc.moveDown(0.8).text('[Da dong dau so trong metadata he thong]', {
        align: 'right',
      });

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

    // Column definitions: [label, x, width]
    const cols: [string, number, number][] = [
      ['LOT',       40,  90],
      ['MATERIAL',  135, 75],
      ['KHO',       215, 70],
      ['VI TRI',    290, 80],
      ['SO LUONG',  375, 60],
      ['DON VI',    440, 45],
      ['TRANG THAI',490, 75],
    ];

    const maxRows = 120;
    const rows = items.slice(0, maxRows);
    const rowHeight = 14;

    // Header row
    let y = doc.y;
    doc.fontSize(8).font('Helvetica-Bold');
    for (const [label, x, w] of cols) {
      doc.text(label, x, y, { width: w, lineBreak: false });
    }
    y += rowHeight - 2;
    doc.moveTo(40, y).lineTo(565, y).lineWidth(0.5).stroke();
    y += 4;

    doc.font('Helvetica');
    for (const row of rows) {
      if (y > 780) {
        doc.addPage();
        y = 40;
      }

      const cells: [string, number, number][] = [
        [row.lot_id,          40,  90],
        [row.material_id,     135, 75],
        [row.warehouse_id,    215, 70],
        [row.storage_location,290, 80],
        [String(row.quantity),375, 60],
        [row.unit_of_measure, 440, 45],
        [row.status,          490, 75],
      ];

      doc.fontSize(7.5);
      for (const [val, x, w] of cells) {
        doc.text(val ?? '-', x, y, { width: w, lineBreak: false, ellipsis: true });
      }
      y += rowHeight;
    }

    // Move cursor past the table
    doc.y = y + 4;

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
