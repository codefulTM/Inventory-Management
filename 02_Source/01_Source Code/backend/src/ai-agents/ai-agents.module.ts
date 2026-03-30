import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InventoryLotModule } from '../inventory-lot/inventory-lot.module';
import { InventoryTransactionModule } from '../inventory-transaction/inventory-transaction.module';
import { QCTestModule } from '../qc-test/qc-test.module';
import { AiAgentsController } from './ai-agents.controller';
import { SupervisorAgent } from './agents/supervisor.agent';
import { InventoryAnalystAgent } from './agents/inventory-analyst.agent';
import { WarehouseOperatorAgent } from './agents/warehouse-operator.agent';
import { QcComplianceCheckerAgent } from './agents/qc-compliance-checker.agent';
import { AgentLlmService } from './services/agent-llm.service';

@Module({
  imports: [
    ConfigModule,
    InventoryLotModule,
    InventoryTransactionModule,
    QCTestModule,
  ],
  controllers: [AiAgentsController],
  providers: [
    SupervisorAgent,
    AgentLlmService,
    InventoryAnalystAgent,
    WarehouseOperatorAgent,
    QcComplianceCheckerAgent,
  ],
  exports: [SupervisorAgent],
})
export class AiAgentsModule {}
