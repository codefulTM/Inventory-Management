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

export interface RetrievalCitation {
  citation_id: string;
  source_collection: string;
  source_id: string;
  source_type?: string;
  score?: number;
  updated_at?: string;
  preview?: string;
}

export interface RetrievalHighlight {
  source_collection: string;
  source_id: string;
  score?: number;
  rag_text_preview?: string;
}

export interface RetrievalData {
  total: number;
  mode: "semantic" | "hybrid" | string;
  used_embedding: boolean;
  disabled_reason?: string;
  highlights?: RetrievalHighlight[];
  citations?: RetrievalCitation[];
}

export interface AgentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AgentLotsSummary {
  total?: number;
  byStatus?: Record<string, number>;
  expiringSoon?: number;
  expired?: number;
}

export interface AgentResultData {
  query?: string;
  query_window_days?: number;
  insights?: string[];
  lots?: AgentLotsSummary;
  pagination?: AgentPagination;
  retrieval?: RetrievalData;
  retrieval_citations?: RetrievalCitation[];
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
