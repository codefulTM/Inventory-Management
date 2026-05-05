// === AI AGENTS HTTP CONTRACT SPEC (COMMENT-ONLY) ===
// File: src/ai-agents/ai-agents-http-contract.spec.ts
// Mục đích: Kiểm thử HTTP API contract cho AI Agents
//
// Test coverage:
// - POST /ai-agents/route request/response schema validation
// - AgentIntent enum values match API documentation
// - AgentHandlerInput/Output types are serializable
// - Error response format matches { status, message, assistant_reply, data }
//
// Type-level tests: Verifies TypeScript interfaces match expected JSON shapes
