import { apiClient } from "./apiClient";
import type { AgentRouteResult, RouteAgentRequest } from "../types/aiAgent";

export async function routeAgent(
  payload: RouteAgentRequest,
): Promise<AgentRouteResult> {
  const { data, error } = await apiClient.post<AgentRouteResult>(
    "/ai-agents/route",
    payload,
  );

  if (error) {
    throw new Error(error.message || "AI agent request failed");
  }

  if (!data) {
    throw new Error("AI agent response is empty");
  }

  return data;
}
