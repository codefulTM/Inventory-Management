import { Body, Controller, Post, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { RouteAgentRequestDto } from './dto/route-agent-request.dto';
import { SupervisorAgent } from './agents/supervisor.agent';
import { InventoryAnalystAgent } from './agents/inventory-analyst.agent';
import { WarehouseOperatorAgent } from './agents/warehouse-operator.agent';
import { QcComplianceCheckerAgent } from './agents/qc-compliance-checker.agent';
import { Public } from '../auth/decorators/public.decorator';

@Controller('ai-agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiAgentsController {
  constructor(
    private readonly supervisorAgent: SupervisorAgent,
    private readonly inventoryAnalystAgent: InventoryAnalystAgent,
    private readonly warehouseOperatorAgent: WarehouseOperatorAgent,
    private readonly qcComplianceCheckerAgent: QcComplianceCheckerAgent,
  ) {}

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

  /**
   * Health check endpoint - no auth required
   * Returns agent infrastructure & LLM status
   */
  @Get('health')
  @Public()
  async health() {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      agents: {
        supervisor: {
          name: 'Supervisor Agent',
          description: 'Intent router dispatching to specialized agents',
          status: 'ready',
        },
        inventory_analyst: {
          name: 'Inventory Analyst',
          description: 'Analyzes inventory, expiry lots, and generates insights',
          status: 'ready',
          tools: ['getLotsStatistics', 'getExpiringSoon', 'getExpiredLots', 'generateReply'],
        },
        warehouse_operator: {
          name: 'Warehouse Operator',
          description: 'Handles lot creation, barcode generation, and warehouse assignment',
          status: 'ready',
          tools: ['createLot', 'generateBarcode', 'assignWarehouse'],
        },
        qc_compliance_checker: {
          name: 'QC Compliance Checker',
          description: 'Performs quality control and compliance checks',
          status: 'ready',
          tools: ['submitDecision', 'getDashboardKPI', 'getSupplierPerformance'],
        },
      },
      llm: {
        provider: 'Google Gemini',
        model: process.env.GEMINI_AGENT_MODEL || process.env.GEMINI_ROUTER_MODEL || 'gemini-2.5-flash',
        status: process.env.GOOGLE_API_KEY ? 'configured' : 'missing',
      },
      architecture: {
        type: 'Multi-Agent System',
        pattern: 'Supervisor + Specialized Agents',
        description: 'Supervisor routes user queries to appropriate specialist agents based on intent classification.',
      },
    };
  }
}
