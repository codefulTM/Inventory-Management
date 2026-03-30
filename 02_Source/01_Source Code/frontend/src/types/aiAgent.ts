export type AgentIntent =
  | "inventory_analyst"
  | "warehouse_operator"
  | "qc_compliance_checker";

export interface AgentRouteResult {
  intent: AgentIntent;
  confidence: number;
  reason: string;
  result: {
    status: "ok" | "needs_input" | "error";
    message: string;
    data?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface RouteAgentRequest {
  query: string;
  action?: string;
  payload?: Record<string, unknown>;
}
