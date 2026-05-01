import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, sign as cryptoSign } from 'crypto';

export interface SignatureResult {
  fileSha256: string;
  signature: string;
  signatureProvider: string;
  signatureSerialNumber?: string;
  signatureValidFrom?: Date;
  signatureValidTo?: Date;
  signedAt: Date;
}

@Injectable()
export class SignatureService {
  constructor(private readonly configService: ConfigService) {}

  signPdf(pdfBuffer: Buffer): SignatureResult {
    const signedAt = new Date();
    const fileSha256 = createHash('sha256').update(pdfBuffer).digest('hex');

    const privateKey = this.configService
      .get<string>('AUDIT_REPORT_SIGNING_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    const serial = this.configService.get<string>(
      'AUDIT_REPORT_SIGNATURE_SERIAL',
    );

    if (privateKey) {
      const signature = cryptoSign('sha256', Buffer.from(fileSha256), {
        key: privateKey,
      }).toString('base64');

      return {
        fileSha256,
        signature,
        signatureProvider: 'RSA_SHA256',
        signatureSerialNumber: serial,
        signedAt,
      };
    }

    const fallbackSecret =
      this.configService.get<string>('AUDIT_REPORT_SIGNING_SECRET') ??
      'inventory-audit-fallback-secret';

    const signature = createHmac('sha256', fallbackSecret)
      .update(fileSha256)
      .digest('base64');

    return {
      fileSha256,
      signature,
      signatureProvider: 'HMAC_SHA256_FALLBACK',
      signatureSerialNumber: serial,
      signedAt,
    };
  }
}
