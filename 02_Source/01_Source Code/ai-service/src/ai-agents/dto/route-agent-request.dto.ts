// DTO cho endpoint POST /ai-agents/route
// Validation: query (bắt buộc), action (tùy chọn), payload (tùy chọn)
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class RouteAgentRequestDto {
  @IsString() // Phải là string
  @MaxLength(4000) // Tối đa 4000 ký tự
  query: string; // Câu hỏi/truy vấn từ người dùng

  @IsString()
  @IsOptional() // Tùy chọn
  @MaxLength(100) // Tối đa 100 ký tự
  action?: string; // Hành động cụ thể (create_lot, submit_decision, ...)

  @IsObject() // Phải là object
  @IsOptional() // Tùy chọn
  payload?: Record<string, unknown>; // Dữ liệu đi kèm (JSON object)
}
