export class AuditEntryDto {
  action: string;
  entity: string;
  performed_by: string;
  performed_at: Date;
  details?: Record<string, unknown>;
}

export class AuditReportDto {
  generated_at: Date;
  entries: AuditEntryDto[];
}
