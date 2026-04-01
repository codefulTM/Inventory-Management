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
  ): Promise<Record<string, unknown>> {
    return this.logService.getLogs(
      { level, error_code: errorCode, module },
      page,
      limit,
    );
  }

  @Get('search')
  @Roles(UserRole.IT_ADMINISTRATOR)
  async searchLogs(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ): Promise<Record<string, unknown>> {
    return this.logService.searchLogs(query, page, limit);
  }

  @Get('stats')
  @Roles(UserRole.IT_ADMINISTRATOR)
  async getStats(): Promise<unknown[]> {
    return (await this.logService.getDashboardStats()) as unknown[];
  }

  @Delete()
  @Roles(UserRole.IT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  async deleteLogs(
    @Query('before') before: string,
  ): Promise<Record<string, unknown>> {
    const date = new Date(before);
    return await this.logService.deleteLogs(date);
  }
}
