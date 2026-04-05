# Architecture Documentation

Generated date: 2026-04-01
Project type: Brownfield (NestJS + React + MongoDB)

## 1. System Context

Inventory Management is a role-based web application for material and lot lifecycle management, quality control, production batch processing, traceability, and reporting.

Primary roles:
- Manager
- Operator
- Quality Control Technician
- IT Administrator

## 2. High-Level Runtime Topology

- Frontend: React + Vite SPA
- Backend: NestJS REST API
- Database: MongoDB
- Identity Provider: Keycloak (OIDC/JWT)
- Optional event backbone: Kafka module in backend

Environment pattern:
- Development: local frontend + local backend + dockerized MongoDB
- Production intent: frontend hosted separately, backend hosted separately, external identity and database services

## 3. Main Components

Backend modules (core business):
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
- System Monitoring
- Barcode
- Event Bus (Kafka)
- AI Agents

Frontend domains:
- Role-based page sets: manager, operator, qc, admin
- Shared service layer with axios API client
- Domain services for materials, lots, transactions, QC, labels, production

## 4. Data Architecture

Primary collections/entities:
- users
- materials
- inventory_lots
- inventory_transactions
- production_batches
- batch_components
- qc_tests
- label_templates
- warehouse_locations

Data lifecycle highlight:
- Material definition -> Lot intake (quarantine) -> QC decision -> transactional movement -> production consumption/creation -> report/audit trail.

## 5. Integration Architecture

External/system integrations:
- Keycloak for token issuance/validation and admin operations
- MongoDB for persistence
- Kafka producer/consumer services for asynchronous event-driven patterns
- Barcode/QR and document export libraries for operational artifacts
- AI routing/generation integration for assistant workflows

## 6. Deployment and Environment View

Observed deployment files indicate:
- Dockerfiles for backend/frontend
- Compose stacks for full app and Mongo-only scenarios
- Different compose files expose different ports; alignment is required during local run

Known local runtime alignment concern:
- Mongo compose can expose 27018 while backend env can point to 27017.
- Ensure backend MONGODB_URI matches the actual exposed Docker port.

## 7. Current Architecture Status

Implemented strongly:
- Core API modules and schemas exist.
- Role-aware UI structure and service layers exist.
- End-to-end path for core inventory entities is present.

Partially implemented / inconsistent:
- Several frontend pages are still placeholders (especially admin/operator/manager dashboards).
- Some backend features contain TODO or mock fallback integration paths.
- Documentation and runtime configs are not fully unified.

## 8. Architecture Risks

- Doc-to-code drift across multiple markdown sources.
- Environment drift between compose files and env files.
- Incomplete UI pathways for some critical operational flows.
- Security and observability controls need stronger standardization.

## 9. Recommended Architecture Actions

1. Create one canonical runtime matrix (dev/staging/prod) with exact ports and env mapping.
2. Publish backend OpenAPI contract and align frontend services to it.
3. Complete stubbed UI pages prioritized by operational criticality.
4. Standardize event contracts for Kafka before broadening event-driven usage.
5. Consolidate architecture docs into one source of truth and mark old docs as historical/reference.
