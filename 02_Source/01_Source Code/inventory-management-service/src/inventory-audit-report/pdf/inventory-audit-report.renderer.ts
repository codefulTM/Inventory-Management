import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { InventoryAuditReportSnapshotItem } from '../inventory-audit-report.repository';

type PdfDoc = InstanceType<typeof PDFDocument>;

/**
 * Interface định nghĩa dữ liệu đầu vào để render báo cáo PDF
 */
export interface RenderInventoryAuditReportInput {
  reportId: string;                    // Mã báo cáo
  periodFrom: Date;                    // Từ ngày
  periodTo: Date;                      // Đến ngày
  templateCode: string;                // Mã mẫu báo cáo
  generatedBy: string;                 // Người lập báo cáo
  approvedBy?: string;                 // Người phê duyệt (tùy chọn)
  generatedAt: Date;                   // Thời điểm xuất báo cáo
  summaryTotalItems: number;           // Tổng số dòng báo cáo
  summaryTotalQuantity: number;        // Tổng số lượng tồn
  summaryTotalValue: number;           // Tổng giá trị tồn (tạm tính)
  items: InventoryAuditReportSnapshotItem[]; // Danh sách chi tiết kiểm kê
}

/**
 * Service render báo cáo kiểm kê ra file PDF sử dụng thư viện pdfkit
 * File PDF bao gồm: Header, Tóm tắt, Bảng chi tiết, Footer
 */
@Injectable()
export class InventoryAuditReportRenderer {
  /**
   * Render báo cáo ra file PDF
   * Sử dụng PDFDocument dạng stream, thu thập chunks để tạo Buffer
   * 
   * @param input - Dữ liệu đầu vào để render
   * @returns Promise<Buffer> - Nội dung file PDF
   */
  async render(input: RenderInventoryAuditReportInput): Promise<Buffer> {
    // Khởi tạo PDF với khổ A4, lề 40px
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
      // Thu thập dữ liệu từ stream
      doc.on('data', (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.from(chunk));
      });
      // Khi kết thúc stream, ghép các chunks thành một Buffer
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Render các phần của báo cáo
      this.renderHeader(doc, input);
      this.renderSummary(doc, input);
      this.renderTable(doc, input.items);

      // Footer — inline after table, no fixed y (avoids spurious new pages)
      // Chân trang: Người lập và Người phê duyệt
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
      // Ghi chú: Chữ ký số được lưu trong metadata hệ thống, không append vào PDF
      doc.moveDown(0.8).text('[Da dong dau so trong metadata he thong]', {
        align: 'right',
      });

      doc.end();
    });
  }

  /**
   * Render phần tiêu đề báo cáo
   * Bao gồm: Tên báo cáo, Mã báo cáo, Kỳ báo cáo, Mẫu biểu, Thời điểm xuất
   */
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
    doc.moveDown(1); // Khoảng cách trước phần tóm tắt
  }

  /**
   * Render phần tóm tắt báo cáo
   * Hiển thị: Số dòng báo cáo, Tổng số lượng tồn, Tổng giá trị tồn
   */
  private renderSummary(doc: PdfDoc, input: RenderInventoryAuditReportInput) {
    doc.fontSize(11).text('Tong hop:');
    doc
      .fontSize(10)
      .text(`- So dong bao cao: ${input.summaryTotalItems}`)
      .text(`- Tong so luong ton: ${input.summaryTotalQuantity}`)
      .text(`- Tong gia tri ton (tam tinh): ${input.summaryTotalValue}`);
    doc.moveDown(1);
  }

  /**
   * Render bảng chi tiết kiểm kê
   * Hiển thị tối đa 120 dòng, các dòng còn lại sẽ có ghi chú
   * Tự động sang trang mới nếu vượt quá chiều cao trang
   */
  private renderTable(doc: PdfDoc, items: InventoryAuditReportSnapshotItem[]) {
    doc.fontSize(11).text('Chi tiet kiem ke:');
    doc.moveDown(0.5);

    // Định nghĩa các cột: [Tiêu đề, Tọa độ X, Độ rộng]
    const cols: [string, number, number][] = [
      ['LOT',       40,  90],
      ['MATERIAL',  135, 75],
      ['KHO',       215, 70],
      ['VI TRI',    290, 80],
      ['SO LUONG',  375, 60],
      ['DON VI',    440, 45],
      ['TRANG THAI',490, 75],
    ];

    const maxRows = 120; // Giới hạn số dòng hiển thị trong PDF
    const rows = items.slice(0, maxRows);
    const rowHeight = 14; // Chiều cao mỗi dòng

    // Vẽ header của bảng
    let y = doc.y;
    doc.fontSize(8).font('Helvetica-Bold'); // Font đậm cho header
    for (const [label, x, w] of cols) {
      doc.text(label, x, y, { width: w, lineBreak: false });
    }
    y += rowHeight - 2;
    doc.moveTo(40, y).lineTo(565, y).lineWidth(0.5).stroke(); // Đường kẻ ngang
    y += 4;

    // Vẽ các dòng dữ liệu
    doc.font('Helvetica'); // Font thường cho dữ liệu
    for (const row of rows) {
      // Tự động sang trang mới nếu vượt quá chiều cao trang (780px)
      if (y > 780) {
        doc.addPage();
        y = 40;
      }

      // Chuẩn bị dữ liệu cho mỗi ô
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
        // Hiển thị giá trị, nếu null/undefined thì hiển thị '-'
        doc.text(val ?? '-', x, y, { width: w, lineBreak: false, ellipsis: true });
      }
      y += rowHeight;
    }

    // Cập nhật con trỏ y sau bảng
    doc.y = y + 4;

    // Ghi chú nếu số dòng vượt quá giới hạn
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
