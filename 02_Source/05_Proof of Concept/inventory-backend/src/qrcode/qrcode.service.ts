import {Injectable} from '@nestjs/common';

export interface QRCodeProduct {
  code: string;
  name: string;
  description?: string;
  url?: string;
  metadata?: any;

  [key: string]: any;
}

@Injectable()
export class QRCodeService {
  private qrcodes: Map<string, QRCodeProduct> = new Map();

  create(product: Omit<QRCodeProduct, 'code'>): QRCodeProduct {
    // Generate a QR code identifier
    const code = 'QR' + Date.now() + Math.floor(Math.random() * 10000);
    const qrcode: QRCodeProduct = {
      code, 
      name: product.name, 
      url: product.url || `https://inventory.example.com/product/${code}`,
      ...product
    };
    this.qrcodes.set(code, qrcode);
    return qrcode;
  }

  get(code: string): QRCodeProduct | undefined {
    return this.qrcodes.get(code);
  }

  list(): QRCodeProduct[] {
    return Array.from(this.qrcodes.values());
  }
}
