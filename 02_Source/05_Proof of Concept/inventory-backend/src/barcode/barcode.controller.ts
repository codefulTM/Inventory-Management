import { Controller, Post, Body, Get, Param, NotFoundException } from '@nestjs/common';
import { BarcodeService, BarcodeProduct } from './barcode.service';

@Controller('barcode')
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  // Tạo barcode từ thông tin sản phẩm
  @Post('generate')
  createBarcode(@Body() body: Omit<BarcodeProduct, 'code'>) {
    return this.barcodeService.create(body);
  }

  // Lấy thông tin barcode theo code
  @Get(':code')
  getBarcode(@Param('code') code: string) {
    const barcode = this.barcodeService.get(code);
    if (!barcode) throw new NotFoundException('Barcode not found');
    return barcode;
  }

  // Liệt kê tất cả barcode
  @Get()
  listBarcodes() {
    return this.barcodeService.list();
  }
}
