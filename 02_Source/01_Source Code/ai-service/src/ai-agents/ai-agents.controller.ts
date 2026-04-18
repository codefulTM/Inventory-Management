import { Body, Controller, Post, Get } from '@nestjs/common';
import { RouteAgentRequestDto } from './dto/route-agent-request.dto';
import { SupervisorAgent } from './agents/supervisor.agent';
import { InventoryAnalystAgent } from './agents/inventory-analyst.agent';
import { WarehouseOperatorAgent } from './agents/warehouse-operator.agent';
import { QcComplianceCheckerAgent } from './agents/qc-compliance-checker.agent';

@Controller('ai-agents')
export class AiAgentsController {
  constructor(
    private readonly supervisorAgent: SupervisorAgent,
    private readonly inventoryAnalystAgent: InventoryAnalystAgent,
    private readonly warehouseOperatorAgent: WarehouseOperatorAgent,
    private readonly qcComplianceCheckerAgent: QcComplianceCheckerAgent,
  ) {}

  @Post('route')
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

  @Get('health')
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
        description: 'Requests routed by supervisor to specialized domain agents',
      },
    };
  }
}
