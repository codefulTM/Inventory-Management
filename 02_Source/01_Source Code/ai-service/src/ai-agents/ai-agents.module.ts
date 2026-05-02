// Module quản lý hệ thống AI Agents (Multi-Agent System)
// Bao gồm: Supervisor Agent (điều hướng) + 3 chuyên gia: Inventory, Warehouse, QC
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BackendClientModule } from "../backend-client/backend-client.module";
import { AgentLlmService } from "./services/agent-llm.service";
import { InventoryAnalystAgent } from "./agents/inventory-analyst.agent";
import { WarehouseOperatorAgent } from "./agents/warehouse-operator.agent";
import { QcComplianceCheckerAgent } from "./agents/qc-compliance-checker.agent";
import { SupervisorAgent } from "./agents/supervisor.agent";
import { AiAgentsController } from "./ai-agents.controller";
import { QueryEmbeddingService } from "./services/query-embedding.service";

@Module({
  imports: [
    ConfigModule, // Đọc biến môi trường cho LLM và Embedding
    BackendClientModule, // Sử dụng BackendDataService gọi gRPC sang backend
  ],
  controllers: [AiAgentsController], // Đăng ký controller xử lý route /ai-agents/*
  providers: [
    AgentLlmService, // Service gọi Google Gemini để sinh phản hồi
    QueryEmbeddingService, // Service tạo embedding vector cho hybrid search
    InventoryAnalystAgent, // Agent phân tích tồn kho và hạn dùng
    WarehouseOperatorAgent, // Agent thao tác kho (tạo lô, barcode, gán kho)
    QcComplianceCheckerAgent, // Agent kiểm tra QC và tuân thủ
    SupervisorAgent, // Agent giám sát điều hướng yêu cầu
  ],
  exports: [SupervisorAgent], // Export để các module khác có thể sử dụng nếu cần
})
export class AiAgentsModule {}
