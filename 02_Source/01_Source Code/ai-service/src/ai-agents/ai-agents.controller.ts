// Controller cho hệ thống AI Agents (Multi-Agent System)
// Endpoint chính: POST /ai-agents/route - Điều hướng yêu cầu tới agent chuyên biệt
// Endpoint health: GET /ai-agents/health - Kiểm tra trạng thái các agents
import { Body, Controller, Post, Get } from '@nestjs/common';
import { RouteAgentRequestDto } from './dto/route-agent-request.dto';
import { SupervisorAgent } from './agents/supervisor.agent';
import { InventoryAnalystAgent } from './agents/inventory-analyst.agent';
import { WarehouseOperatorAgent } from './agents/warehouse-operator.agent';
import { QcComplianceCheckerAgent } from './agents/qc-compliance-checker.agent';

@Controller('ai-agents')
export class AiAgentsController {
  constructor(
    // Agent giám sát: Điều hướng yêu cầu tới agent chuyên biệt
    private readonly supervisorAgent: SupervisorAgent,
    // Agent phân tích tồn kho và hạn dùng
    private readonly inventoryAnalystAgent: InventoryAnalystAgent,
    // Agent thao tác kho (tạo lô, barcode, gán kho)
    private readonly warehouseOperatorAgent: WarehouseOperatorAgent,
    // Agent kiểm tra QC và tuân thủ
    private readonly qcComplianceCheckerAgent: QcComplianceCheckerAgent,
  ) {}

  // Endpoint điều hướng yêu cầu tới agent phù hợp
  // Body: { query: string, action?: string, payload?: Record<string, unknown> }
  @Post('route')
  async route(@Body() body: RouteAgentRequestDto) {
    // Gọi SupervisorAgent để phân loại intent và điều hướng
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

  // Endpoint kiểm tra sức khỏe của hệ thống AI Agents
  // Trả về trạng thái của từng agent, cấu hình LLM và kiến trúc hệ thống
  @Get('health')
  async health() {
    return {
      success: true,
      timestamp: new Date().toISOString(),
      agents: {
        // Thông tin Supervisor Agent
        supervisor: {
          name: 'Supervisor Agent',
          description: 'Intent router dispatching to specialized agents',
          status: 'ready',
        },
        // Thông tin Inventory Analyst Agent
        inventory_analyst: {
          name: 'Inventory Analyst',
          description: 'Analyzes inventory, expiry lots, and generates insights',
          status: 'ready',
          tools: ['getLotsStatistics', 'getExpiringSoon', 'getExpiredLots', 'generateReply'],
        },
        // Thông tin Warehouse Operator Agent
        warehouse_operator: {
          name: 'Warehouse Operator',
          description: 'Handles lot creation, barcode generation, and warehouse assignment',
          status: 'ready',
          tools: ['createLot', 'generateBarcode', 'assignWarehouse'],
        },
        // Thông tin QC Compliance Checker Agent
        qc_compliance_checker: {
          name: 'QC Compliance Checker',
          description: 'Performs quality control and compliance checks',
          status: 'ready',
          tools: ['submitDecision', 'getDashboardKPI', 'getSupplierPerformance'],
        },
      },
      llm: {
        provider: 'Google Gemini', // Sử dụng Gemini làm LLM
        model: process.env.GEMINI_AGENT_MODEL || process.env.GEMINI_ROUTER_MODEL || 'gemini-2.5-flash',
        status: process.env.GOOGLE_API_KEY ? 'configured' : 'missing',
      },
      architecture: {
        type: 'Multi-Agent System', // Kiến trúc đa agent
        pattern: 'Supervisor + Specialized Agents', // Mẫu thiết kế: Giám sát + Chuyên gia
        description: 'Requests routed by supervisor to specialized domain agents',
      },
    };
  }
}
