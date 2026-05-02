// Module gốc của AI Service
// Tích hợp 2 module chính:
// - AiModule: Cung cấp các endpoint AI thông thường (phân tích nhà cung cấp)
// - AiAgentsModule: Cung cấp hệ thống multi-agent (Supervisor + chuyên gia)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { AiAgentsModule } from './ai-agents/ai-agents.module';

@Module({
  imports: [
    // Cấu hình ConfigModule toàn cục để đọc biến môi trường từ file .env
    ConfigModule.forRoot({ isGlobal: true }),
    // Module AI thông thường (supplier analysis qua HuggingFace)
    AiModule,
    // Module AI Agents (hệ thống multi-agent qua Google Gemini)
    AiAgentsModule,
  ],
})
export class AppModule {}
