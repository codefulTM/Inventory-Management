import { Controller, Post, Body, Get, Param, NotFoundException } from '@nestjs/common';
import { QRCodeService, QRCodeProduct } from './qrcode.service';

@Controller('qrcode')
export class QRCodeController {
  constructor(private readonly qrcodeService: QRCodeService) {}

  // Tạo QR code từ thông tin sản phẩm
  @Post('generate')
  createQRCode(@Body() body: Omit<QRCodeProduct, 'code'>) {
    return this.qrcodeService.create(body);
  }

  // Lấy thông tin QR code theo code
  @Get(':code')
  getQRCode(@Param('code') code: string) {
    const qrcode = this.qrcodeService.get(code);
    if (!qrcode) throw new NotFoundException('QR Code not found');
    return qrcode;
  }

  // Liệt kê tất cả QR code
  @Get()
  listQRCodes() {
    return this.qrcodeService.list();
  }
}
