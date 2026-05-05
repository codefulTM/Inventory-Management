// === SUPERVISOR AGENT SPEC (COMMENT-ONLY) ===
// File: src/ai-agents/agents/supervisor.agent.spec.ts
// Mục đích: Unit test cho SupervisorAgent routing logic
//
// Test coverage:
// - routes to inventory_analyst when query contains inventory keywords
// - routes to warehouse_operator when query contains warehouse keywords (tạo lô, barcode)
// - routes to qc_compliance_checker when query contains QC keywords
// - returns fallback for unknown/greeting queries
// - handles Gemini router disabled (USE_GEMINI_ROUTER=false)
// - infers action from query when action is missing
//
// Mocks: ConfigService (USE_GEMINI_ROUTER=false), InventoryAnalystAgent, WarehouseOperatorAgent, QcComplianceCheckerAgent
// All agent handles return mocked okResult
