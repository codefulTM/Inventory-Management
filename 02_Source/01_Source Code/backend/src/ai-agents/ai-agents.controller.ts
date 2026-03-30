import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { RouteAgentRequestDto } from './dto/route-agent-request.dto';
import { SupervisorAgent } from './agents/supervisor.agent';

@Controller('ai-agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiAgentsController {
  constructor(private readonly supervisorAgent: SupervisorAgent) {}

  @Post('route')
  @Roles(UserRole.MANAGER, UserRole.OPERATOR, UserRole.QC_TECHNICIAN)
  async route(@Body() body: RouteAgentRequestDto) {
    const result = await this.supervisorAgent.route({
      query: body.query,
      action: body.action,
      payload: body.payload,
    });

    return {
      success: true,
      data: result,
    };
  }
}
