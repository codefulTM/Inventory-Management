import {
  Controller,
  Get,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { LogService } from './log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get()
  @Roles(UserRole.IT_ADMINISTRATOR)
  async getLogs(
    @Query('level') level?: string,
    @Query('error_code') errorCode?: string,
    @Query('module') module?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ) {
    return this.logService.getLogs({ level, error_code: errorCode, module }, page, limit);
  }

  @Get('search')
  @Roles(UserRole.IT_ADMINISTRATOR)
  async searchLogs(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ) {
    return this.logService.searchLogs(query, page, limit);
  }

  @Get('stats')
  @Roles(UserRole.IT_ADMINISTRATOR)
  async getStats() {
    return this.logService.getDashboardStats();
  }

  @Delete()
  @Roles(UserRole.IT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  async deleteLogs(@Query('before') before: string) {
    const date = new Date(before);
    return this.logService.deleteLogs(date);
  }
}
