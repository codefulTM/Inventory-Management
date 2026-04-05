# Backend Documentation

Generated date: 2026-04-01
Backend stack: NestJS + TypeScript + Mongoose

## 1. Technical Stack

Core:
- NestJS 11
- Node.js runtime
- TypeScript
- MongoDB with Mongoose

Major supporting libraries:
- Passport JWT and JWKS for auth token verification
- class-validator / class-transformer for input contracts
- Kafka client support for event bus
- xlsx/pdf/barcode-related libraries for output artifacts

## 2. Module Inventory

Business modules:
- Auth
- User
- Material
- Inventory Lot
- Inventory Transaction
- Production Batch
- QC Test
- Label Template
- Warehouse Hierarchy
- Reports

Platform modules:
- System Monitoring
- Event Bus
- Barcode
- AI Agents

## 3. API Surface (Conceptual)

Key endpoint groups include:
- /auth
- /users
- /materials
- /inventory-lots
- /transactions or /inventory-transactions (naming should be standardized)
- /production-batches
- /qc-tests
- /label-templates
- /warehouse
- /reports
- /system-monitoring

Note:
- Route naming and docs should be normalized into one contract (OpenAPI suggested).

## 4. Data Model and Persistence

Main collections:
- users
- materials
- inventory_lots
- inventory_transactions
- production_batches
- batch_components
- qc_tests
- label_templates
- warehouse_locations

Model strengths:
- Rich metadata fields for traceability
- Domain-specific status and lifecycle fields
- Support for transaction and QC-centric operations

## 5. Business Logic Patterns

Observed architecture pattern:
- Controller -> Service -> Repository -> Schema

Benefits:
- Clear separation of transport, business logic, and persistence concerns
- Testable module boundaries
- Easier refactoring for data-source changes

## 6. Integration Dependencies

Backend integration points:
- Keycloak admin and token ecosystem
- MongoDB connection and schema layer
- Kafka producers/consumers for asynchronous events
- AI APIs for intent/assistant features

## 7. Quality and Testing Snapshot

Positive:
- Unit test presence across several modules
- Core transaction logic has notable test coverage

Gaps:
- End-to-end coverage appears limited/non-uniform
- Cross-module integration tests need expansion
- Test strategy doc is not centralized for the team

## 8. Backend Risks and Gaps

1. Config and port mismatches across env/compose files.
2. Incomplete integrations in selected modules (TODO/mocked paths).
3. Missing canonical API documentation.
4. Security hardening not yet consistently automated.

## 9. Recommended Backend Next Actions

1. Generate and publish OpenAPI contract from controllers/DTOs.
2. Add integration tests for high-value workflow chains.
3. Standardize route naming and response envelope conventions.
4. Introduce security middleware baseline (rate limit, headers, validation policy).
5. Align env and compose configurations into one documented dev standard.
