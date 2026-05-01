import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { BarcodeService } from './barcode.service';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

@Controller('barcode')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  /**
   * POST /barcode/query
   * US41: Query lot information by barcode (scan or manual input)
   * Body: { barcode: string }
   * Accessible by: Manager, Operator, QC
   */
  @Post('query')
  @Roles(UserRole.MANAGER, UserRole.OPERATOR, UserRole.QC_TECHNICIAN)
  @HttpCode(HttpStatus.OK)
  async queryByBarcode(
    @Body('barcode') barcode: string,
  ): Promise<Record<string, unknown>> {
    const result = await this.barcodeService.queryByBarcode(barcode);
    if (!result) {
      return { found: false, message: 'Barcode not found' };
    }
    return { found: true, data: result };
  }

  /**
   * GET /barcode/download/:lot_id
   * US40: Download barcode for a single lot
   * Query params: format (png/svg), type (code128/ean13/qrcode)
   * Accessible by: QC
   */
  @Get('download/:lot_id')
  @Roles(UserRole.QC_TECHNICIAN)
  @HttpCode(HttpStatus.OK)
  async downloadBarcode(
    @Param('lot_id') lot_id: string,
    @Query('format') format: 'png' | 'svg' = 'png',
    @Query('type') type: 'code128' | 'ean13' | 'qrcode' = 'code128',
    @Res() res?: Response,
  ): Promise<void> {
    const buffer = await this.barcodeService.generateBarcodeImage(
      lot_id,
      format,
      type,
    );

    if (res) {
      res.setHeader('Content-Type', `image/${format}`);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="barcode_${lot_id}.${format}"`,
      );
      res.send(buffer);
    }
  }

  /**
   * POST /barcode/batch-download
   * US40: Download multiple barcodes as ZIP
   * Body: { lot_ids: string[] }
   * Accessible by: QC
   */
  @Post('batch-download')
  @Roles(UserRole.QC_TECHNICIAN)
  @HttpCode(HttpStatus.OK)
  async batchDownloadBarcodes(
    @Body('lot_ids') lot_ids: string[],
    @Res() res?: Response,
  ) {
    const buffers = await this.barcodeService.generateBatchBarcodes(lot_ids);

    if (res && buffers.length > 0) {
      // For simplicity, return as JSON array of base64 encoded images
      // In production, you'd want to create a ZIP file
      const base64Barcodes = buffers.map((buf) => buf.toString('base64'));
      res.setHeader('Content-Type', 'application/json');
      res.send({ barcodes: base64Barcodes, count: base64Barcodes.length });
    }
  }
}
