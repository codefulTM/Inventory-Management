import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class RouteAgentRequestDto {
  @IsString()
  @MaxLength(4000)
  query: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  action?: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
