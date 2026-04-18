import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getApiInfo() {
    return {
      name: 'Inventory Management API',
      version: '1.0.0',
      status: 'running',
      endpoints: [
        '/materials',
        '/inventory-lots',
        '/production-batches',
        '/label-templates',
      ],
    };
  }

  @Public()
  @Get('health')
  health(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
