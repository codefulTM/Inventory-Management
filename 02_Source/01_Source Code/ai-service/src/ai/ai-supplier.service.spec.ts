// === AI SUPPLIER SERVICE SPEC (COMMENT-ONLY) ===
// File: src/ai/ai-supplier.service.spec.ts
// Mục đích: Unit test cho AiSupplierService
//
// Test coverage:
// - should be defined: Service initializes without throwing
// - analyzeAllSuppliers with AI: Calls HuggingFace API, parses response, returns analysis DTO
// - analyzeAllSuppliers fallback: When AI fails, uses heuristic to pick top 3 suppliers
// - analyzeSingleSupplier: Builds prompt with supplier data, returns detailed analysis
// - testConnection: Verifies HuggingFace API connectivity
//
// Mocks: ConfigService (returns undefined for API keys), BackendDataService
// Note: Tests run without real API keys to verify graceful degradation
