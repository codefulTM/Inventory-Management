export type AgentIntent =
  | "inventory_analyst"
  | "warehouse_operator"
  | "qc_compliance_checker"
  | "unknown";

export interface AssistantLotRow {
  lot_id: string;
  material_id: string;
  expiration_date: string;
  quantity: number;
  unit_of_measure: string;
  status: string;
}

export interface AgentResultData {
  expiringLots?: AssistantLotRow[];
  expiredLots?: AssistantLotRow[];
  [key: string]: unknown;
}

export interface AgentRouteResult {
  intent: AgentIntent;
  confidence: number;
  reason: string;
  result: {
    status: "ok" | "needs_input" | "error";
    message: string;
    assistant_reply?: string;
    agent_profile?: {
      name: string;
      description: string;
      instructions: string[];
      model: string;
      tools: string[];
    };
    data?: AgentResultData;
  };
  timestamp: string;
}

export interface RouteAgentRequest {
  query: string;
  action?: string;
  payload?: Record<string, unknown>;
}
