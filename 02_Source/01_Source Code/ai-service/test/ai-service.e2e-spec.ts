// === AI SERVICE E2E TEST (COMMENT-ONLY) ===
// File: test/ai-service.e2e-spec.ts
// Mục đích: Kiểm thử tích hợp end-to-end cho ai-service
//
// Test coverage:
// - GET /ai-agents/health: Returns 200 with success, agents list, and llm config status
// - POST /ai-agents/route (inventory): Routes inventory query to InventoryAnalystAgent, returns lot stats
// - POST /ai-agents/route (warehouse): Routes warehouse query to WarehouseOperatorAgent, handles create_lot
// - POST /ai-agents/route (QC): Routes QC query to QcComplianceCheckerAgent, handles submit_decision
// - POST /ai/analyze-suppliers/all: Returns supplier analysis with top 3 and AI insights
// - POST /ai/analyze-suppliers/:id: Returns single supplier analysis
//
// Mocks: Uses real NestJS app with AppModule, no external service mocking
// Setup: Starts full NestJS application, runs HTTP requests via supertest
