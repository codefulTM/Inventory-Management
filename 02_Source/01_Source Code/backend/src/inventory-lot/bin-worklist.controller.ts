import {
  Controller,
  Get,
  Post,
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
}
