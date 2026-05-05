// === QUERY EMBEDDING SERVICE SPEC (COMMENT-ONLY) ===
// File: src/ai-agents/services/query-embedding.service.spec.ts
// Mục đích: Unit test cho QueryEmbeddingService (HuggingFace embedding API)
//
// Test coverage:
// - embedQuery with valid config: Calls API, returns normalized vector
// - embedQuery without API URL: Returns null, warns once
// - embedQuery without API key: Returns null, warns once
// - embedQuery empty query: Returns null immediately
// - normalizeVector: Truncates or pads to correct dimensions
// - parseEmbeddingResponse: Handles flat array and nested array formats
//
// Mocks: ConfigService (EMBEDDING_API_URL, HUGGINGFACE_API_KEY, etc.), fetch API
