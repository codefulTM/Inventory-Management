// File: services/aiAgent.service.ts
// Service gọi AI Agent API để định tuyến câu hỏi của người dùng
// Xử lý chuẩn hóa query và action trước khi gửi đến backend

import { apiClient } from "./apiClient";
import type { AgentRouteResult, RouteAgentRequest } from "../types/aiAgent";

// Chuẩn hóa payload: loại bỏ dấu tiếng Việt, trim khoảng trắng
function sanitizeRoutePayload(payload: RouteAgentRequest): RouteAgentRequest {
  const normalizedQuery = (payload.query || "").normalize("NFC").trim();
  const normalizedAction = payload.action?.normalize("NFC").trim();

  return {
    query: normalizedQuery,
    action: normalizedAction || undefined,
    payload: payload.payload,
  };
}

// Gửi yêu cầu đến AI Agent để định tuyến câu hỏi
// Trả về intent, kết quả và thông tin chi tiết từ AI
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
