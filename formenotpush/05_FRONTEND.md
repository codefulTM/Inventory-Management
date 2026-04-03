# Frontend Documentation

Generated date: 2026-04-01
Frontend stack: React + TypeScript + Vite

## 1. Technical Stack

Core:
- React 19
- TypeScript
- Vite (rolldown-vite)
- React Router

UI and UX libraries:
- MUI
- Ant Design
- Tailwind CSS
- lucide-react + MUI icons

Data access:
- Axios-based shared API client
- Feature-specific service wrappers

State approach:
- Local component state + localStorage for auth/session persistence

## 2. Application Structure

Primary page domains:
- manager
- operator
- qc
- admin
- auth/shared pages

Service layer domains:
- auth
- materials
- inventory lots
- transactions
- QC
- labels
- production

## 3. Role-Based UI Status

Manager:
- Some core management pages are operational (materials/labels/production subsets).
- Several dashboards/reports/user-management areas remain stub/partial.

Operator:
- Stock-in flow exists.
- Stock-out and some operational pages are partial/stub.

QC:
- Core QC flow pages exist.
- Some screens include fallback/mock behavior and need production hardening.

IT Admin:
- Multiple admin pages are still placeholder status.

## 4. API Integration Pattern

Current pattern:
1. Shared axios instance with base URL from env.
2. Request interceptor for auth token.
3. Feature services for endpoint grouping.
4. Component-level async handling for loading/error states.

Strengths:
- Reusable service architecture.
- Clear API abstraction boundary.

Gaps:
- Inconsistent completion across modules.
- No single typed API contract shared from backend spec.
- Limited evidence of robust frontend test coverage.

## 5. Frontend Quality Snapshot

Current quality profile:
- Good component base and domain segmentation.
- Incomplete route coverage across roles.
- Testing depth appears light.
- Error handling exists but observability integration is not fully mature.

## 6. UX and Workflow Consistency Risks

1. Some role journeys are broken due to placeholder pages.
2. Mixed completion levels can create permission vs capability confusion.
3. Mock fallback logic can blur production behavior when APIs fail.

## 7. Recommended Frontend Next Actions

1. Complete highest-priority role routes first:
- Operator stock-out
- Manager reporting/dashboard essentials
- Admin monitoring essentials
2. Remove or strictly gate mock fallback paths for production.
3. Adopt contract-first API typing from backend OpenAPI.
4. Add workflow-driven UI integration tests per role.
5. Introduce route-level completion matrix in docs for transparent progress tracking.
