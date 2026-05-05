// === AGENT LLM SERVICE SPEC (COMMENT-ONLY) ===
// File: src/ai-agents/services/agent-llm.service.spec.ts
// Mục đích: Unit test cho AgentLlmService (Gemini LLM integration)
//
// Test coverage:
// - generateReply with valid API key: Calls Gemini API, returns cleaned Vietnamese text
// - generateReply without API key: Returns null gracefully
// - generateReply timeout: Handles AbortError, returns null
// - safeJsonStringify: Handles circular references, returns '{}'
// - cleanLlmResponse: Removes markdown code blocks, trims whitespace
//
// Mocks: ConfigService (GOOGLE_API_KEY), fetch API
