import { apiClient } from "./apiClient";
import type { AgentRouteResult, RouteAgentRequest } from "../types/aiAgent";

function sanitizeRoutePayload(payload: RouteAgentRequest): RouteAgentRequest {
  const normalizedQuery = (payload.query || "").normalize("NFC").trim();
  const normalizedAction = payload.action?.normalize("NFC").trim();

  return {
    query: normalizedQuery,
    action: normalizedAction || undefined,
    payload: payload.payload,
  };
}

export async function routeAgent(
  payload: RouteAgentRequest,
): Promise<AgentRouteResult> {
  const requestPayload = sanitizeRoutePayload(payload);

  const { data, error } = await apiClient.post<AgentRouteResult>(
    "/ai-agents/route",
    requestPayload,
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
    },
  );

  if (error) {
    throw new Error(error.message || "AI agent request failed");
  }

  if (!data) {
    throw new Error("AI agent response is empty");
  }

  return data;
}
