import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, sign as cryptoSign } from 'crypto';

/**
 * Interface định nghĩa kết quả ký số một file PDF
 */
export interface SignatureResult {
  fileSha256: string;               // Mã băm SHA-256 của file PDF
  signature: string;                 // Chữ ký số (dạng base64)
  signatureProvider: string;          // Nhà cung cấp: 'RSA_SHA256' hoặc 'HMAC_SHA256_FALLBACK'
  signatureSerialNumber?: string;     // Số serial chứng thư số (nếu có)
  signatureValidFrom?: Date;          // Chữ ký có hiệu lực từ (tùy chọn)
  signatureValidTo?: Date;            // Chữ ký hết hiệu lực (tùy chọn)
  signedAt: Date;                    // Thời điểm ký
}

/**
 * Service xử lý ký số (digital signature) cho báo cáo kiểm kê
 * 
 * Cơ chế:
 * 1. Tính mã băm SHA-256 của file PDF
 * 2. Nếu có cấu hình private key (RSA): Ký bằng RSA-SHA256
 * 3. Nếu không có: Sử dụng HMAC-SHA256 với secret (fallback)
 * 
 * Cấu hình (trong .env):
 * - AUDIT_REPORT_SIGNING_PRIVATE_KEY: Khóa riêng RSA (để ký số chuẩn)
 * - AUDIT_REPORT_SIGNATURE_SERIAL: Số serial chứng thư
 * - AUDIT_REPORT_SIGNING_SECRET: Secret cho HMAC (fallback)
 */
@Injectable()
export class SignatureService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Ký số một file PDF
   * @param pdfBuffer - Buffer chứa nội dung file PDF cần ký
   * @returns SignatureResult - Thông tin chữ ký số
   */
  signPdf(pdfBuffer: Buffer): SignatureResult {
    const signedAt = new Date();
    
    // Bước 1: Tính mã băm SHA-256 của file PDF
    const fileSha256 = createHash('sha256').update(pdfBuffer).digest('hex');

    // Đọc cấu hình khóa riêng RSA và serial chứng thư
    const privateKey = this.configService
      .get<string>('AUDIT_REPORT_SIGNING_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n'); // Thay thế \n bằng xuống dòng thực (cho PEM format)
    const serial = this.configService.get<string>(
      'AUDIT_REPORT_SIGNATURE_SERIAL',
    );

    // Nếu có cấu hình private key: Sử dụng RSA-SHA256 để ký
    if (privateKey) {
      const signature = cryptoSign('sha256', Buffer.from(fileSha256), {
        key: privateKey,
      }).toString('base64');

      return {
        fileSha256,
        signature,
        signatureProvider: 'RSA_SHA256', // Ký bằng RSA chuẩn
        signatureSerialNumber: serial,
        signedAt,
      };
    }

    // Fallback: Sử dụng HMAC-SHA256 với secret
    const fallbackSecret =
      this.configService.get<string>('AUDIT_REPORT_SIGNING_SECRET') ??
      'inventory-audit-fallback-secret'; // Secret mặc định (không an toàn cho production)

    const signature = createHmac('sha256', fallbackSecret)
      .update(fileSha256)
      .digest('base64');

    return {
      fileSha256,
      signature,
      signatureProvider: 'HMAC_SHA256_FALLBACK', // Ký bằng HMAC (fallback)
      signatureSerialNumber: serial,
      signedAt,
    };
  }
}
