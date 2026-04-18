import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/auth/decorators/public.decorator';
import { register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get()
  @Public()
  async getMetrics(@Res() response: Response): Promise<void> {
    response.set('Content-Type', register.contentType);
    response.end(await register.metrics());
  }
}
