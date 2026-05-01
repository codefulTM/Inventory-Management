import {Injectable} from '@nestjs/common';

export interface BarcodeProduct {
  code: string;
  name: string;
  description?: string;

  [key: string]: any;
}

@Injectable()
export class BarcodeService {
  private barcodes: Map<string, BarcodeProduct> = new Map();

  create(product: Omit<BarcodeProduct, 'code'>): BarcodeProduct {
    // Generate a simple code (could use uuid or hash in real app)
    const code = 'BC' + Date.now() + Math.floor(Math.random() * 1000);
    const barcode: BarcodeProduct = {code, name: product.name, ...product};
    this.barcodes.set(code, barcode);
    return barcode;
  }

  get(code: string): BarcodeProduct | undefined {
    return this.barcodes.get(code);
  }

  list(): BarcodeProduct[] {
    return Array.from(this.barcodes.values());
  }
}
