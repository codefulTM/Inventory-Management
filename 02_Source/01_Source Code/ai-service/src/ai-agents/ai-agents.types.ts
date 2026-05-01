export enum AgentIntent {
  INVENTORY_ANALYST = 'inventory_analyst',
  WAREHOUSE_OPERATOR = 'warehouse_operator',
  QC_COMPLIANCE_CHECKER = 'qc_compliance_checker',
  UNKNOWN = 'unknown',
}

export interface AgentRouteResult<T = unknown> {
  intent: AgentIntent;
  confidence: number;
  reason: string;
  result: T;
  timestamp: string;
}

export interface AgentHandlerInput {
  query: string;
  action?: string;
  payload?: Record<string, unknown>;
}

export interface AgentProfile {
  name: string;
  description: string;
  instructions: string[];
  model: string;
  tools: string[];
}

export interface AgentHandlerOutput {
  status: 'ok' | 'needs_input' | 'error';
  message: string;
  data?: Record<string, unknown>;
  assistant_reply?: string;
  agent_profile?: AgentProfile;
}
