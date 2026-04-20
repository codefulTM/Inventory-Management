import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { BinWorklistService } from './bin-worklist.service';
import { BinWorklistQueryDto, SubmitBinCountDto } from './dto/bin-worklist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('bins')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BinWorklistController {
  constructor(private readonly service: BinWorklistService) {}

  @Get('worklist')
  async getWorklist(@Query() query: BinWorklistQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    return await this.service.getWorklist(query.warehouse_id, page, limit);
  }

  @Get(':bin_code')
  async getBinDetails(@Param('bin_code') bin_code: string) {
    return await this.service.getBinDetails(bin_code);
  }

  @Post(':bin_code/counts')
  async submitCounts(
    @Param('bin_code') bin_code: string,
    @Body(ValidationPipe) dto: SubmitBinCountDto,
  ) {
    return await this.service.submitCounts(bin_code, dto);
  }

  @Post()
  async createBin(
    @Body()
    body: {
      bin_code: string;
      warehouse_id?: string;
      location_name?: string;
      expected_qty?: number;
    },
  ) {
    return await this.service.createBin(body);
  }

  @Put(':bin_code')
  async updateBin(
    @Param('bin_code') bin_code: string,
    @Body()
    body: {
      warehouse_id?: string;
      location_name?: string;
      is_active?: boolean;
      expected_qty?: number;
    },
  ) {
    return await this.service.updateBin(bin_code, body);
  }

  @Delete(':bin_code')
  async deleteBin(@Param('bin_code') bin_code: string) {
    return await this.service.deleteBin(bin_code);
  }
}
