import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BackendClientModule } from '../backend-client/backend-client.module';
import { AgentLlmService } from './services/agent-llm.service';
import { InventoryAnalystAgent } from './agents/inventory-analyst.agent';
import { WarehouseOperatorAgent } from './agents/warehouse-operator.agent';
import { QcComplianceCheckerAgent } from './agents/qc-compliance-checker.agent';
import { SupervisorAgent } from './agents/supervisor.agent';
import { AiAgentsController } from './ai-agents.controller';

@Module({
  imports: [ConfigModule, BackendClientModule],
  controllers: [AiAgentsController],
  providers: [
    AgentLlmService,
    InventoryAnalystAgent,
    WarehouseOperatorAgent,
    QcComplianceCheckerAgent,
    SupervisorAgent,
  ],
  exports: [SupervisorAgent],
})
export class AiAgentsModule {}
