# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

```
/
├── 02_Source/01_Source Code/   ← main source (referred to as "source root")
│   ├── backend/                ← NestJS API (port 3001)
│   ├── frontend/               ← React + Vite (port 5173 dev / 80 Docker)
│   ├── infra/                  ← Dockerfiles, nginx, monitoring configs
│   │   └── monitoring/         ← Prometheus + Grafana stack
│   ├── database/               ← MongoDB init scripts, Keycloak realm export
│   ├── docker-compose.yml      ← BE + FE
│   ├── docker-compose-mongo.yml
│   └── docker-compose-keycloak.yml
├── Jenkinsfile                 ← CI/CD pipeline
└── docker-compose.yml          ← root-level compose (for Render/prod)
```

All `docker compose` commands reference `02_Source/01_Source Code/` compose files, not the root one.

---

## Development Commands

### Backend

```bash
cd "02_Source/01_Source Code/backend"
npm install
npm run start:dev        # watch mode, port 3001
npm run test             # unit tests (src/unit-test/)
npm run test:e2e         # e2e tests (test/jest-e2e.json)
npm run test:cov         # coverage
```

Run a single test file:
```bash
npx jest --testPathPattern=src/unit-test/foo.spec.ts --forceExit
```

### Frontend

```bash
cd "02_Source/01_Source Code/frontend"
npm install
npm run dev              # port 5173
npm run build
```

### Docker (full local stack)

```bash
cd "02_Source/01_Source Code"

# Prerequisites — create the shared network once
docker network create inventory_network

# Start MongoDB
docker compose -f docker-compose-mongo.yml up -d

# Start Keycloak (needs MongoDB or standalone)
docker compose -f docker-compose-keycloak.yml up -d

# Start backend + frontend
docker compose -f docker-compose.yml up --build -d

# Start monitoring stack
docker compose -f infra/monitoring/docker-compose-grafana.yml up -d
```

### MongoDB credentials (local Docker)
- Host: `localhost:27018` (external) / `inventory_mongo:27017` (internal)
- Username: `admin` / Password: `password123` / AuthSource: `admin`

---

## Backend Architecture

### Module structure

Every domain follows the pattern: **Controller → Service → Repository → Mongoose Schema**. Schemas live in `src/schemas/`, use snake_case field names, and timestamp as `created_date`/`modified_date` (not the Mongoose default).

### Auth & Guards

`JwtAuthGuard` and `RolesGuard` are registered globally in `AppModule` via `APP_GUARD`. Every route is protected by default.
- To make a route public: `@Public()` decorator
- To restrict by role: `@Roles('manager')` decorator
- Keycloak is the identity provider. `KeycloakModule` (global) exposes `KeycloakService` for Admin API calls (user/role sync). JWT tokens are issued by Keycloak, validated by the backend's `JwtStrategy`.

### Key modules

| Module | Purpose |
|---|---|
| `auth` | JWT strategy, login, register, password reset |
| `keycloak` | Global service wrapping Keycloak Admin REST API |
| `user` | User CRUD, role assignment |
| `material` | Material master data (API, Excipient, etc.) |
| `inventory-lot` | Lot tracking, stock levels |
| `inventory-transaction` | All stock movements (IN/OUT) |
| `production-batch` | Batch + batch-components (embedded docs) |
| `qc-test` | QC results, quarantine |
| `import-export-order` | Inbound/outbound order workflow |
| `inventory-adjustment` | Manual stock corrections |
| `inventory-audit-report` | Periodic stocktake reports |
| `warehouse-hierarchy` | Zone/rack/bin structure |
| `label-template` | Barcode/QR label templates |
| `barcode` | Barcode/QR generation |
| `ai-agents` | Multi-agent AI (Supervisor → specialist agents) using HuggingFace API |
| `event-bus` | Kafka producers/consumers for cross-module events |
| `metrics` | Exposes `/metrics` (public) for Prometheus via `prom-client` |
| `audit-log` | Immutable audit trail for all mutations |
| `mail` | Gmail SMTP via nodemailer |

### AI Agents

`ai-agents/` implements a supervisor pattern: `SupervisorAgent` routes requests to `InventoryAnalystAgent`, `WarehouseOperatorAgent`, or `QcComplianceCheckerAgent`. LLM calls go through `AgentLlmService` → HuggingFace Inference API (model configured via `HUGGINGFACE_MODEL` env var).

### Kafka (event-bus)

Cross-module events (inventory changes, QC results, batch lifecycle) are published via `KafkaService` and consumed by domain-specific handlers. Kafka is optional for local dev — modules work without it but won't emit events.

---

## Frontend Architecture

### Routing & Role-based access

`src/router/index.tsx` defines all routes. Every protected route uses `requireAuth(element, roles)`. Four role namespaces:

| URL prefix | Role key | Keycloak role |
|---|---|---|
| `/admin/*` | `it_admin` | IT Administrator |
| `/manager/*` | `manager` | Manager |
| `/operator/*` | `operator` | Operator |
| `/qc/*` | `quality-control` | Quality Control Technician |

Role normalization happens in `getUserRole()` — backend sends display names, frontend maps them to slugs.

Auth state is stored in `localStorage`: `auth_token` (JWT) and `user` (JSON object). `isTokenValid()` in `src/utils/authUtils.ts` checks expiry.

### State & API

No global state library (no Redux/Zustand). Components fetch directly via API calls. `VITE_API_URL` env var sets the backend base URL.

---

## Infrastructure

### Docker network

All containers join `inventory_network` (external). Must exist before any compose file is started.

### Monitoring stack (`infra/monitoring/`)

- `docker-compose-grafana.yml` — Prometheus (9090), Grafana (3002), node-exporter (9100), cAdvisor (8082), mongodb-exporter (9216)
- `prometheus.yml` — scrape configs for all services
- `grafana/provisioning/datasources/prometheus.yml` — auto-provisions Prometheus datasource on Grafana start
- `scripts/import-dashboards.sh` — imports dashboards 1860, 14282, 2583 via Grafana API
- `scripts/check-grafana.sh` — health check for the full monitoring stack

Grafana credentials: `admin / admin123`

### CI/CD (Jenkinsfile)

Pipeline stages: **Prepare ENV → Unit Test → Integration Test → Stop Old → Build Docker → Deploy → E2E Test**

Tests run inside ephemeral `node:20-alpine` containers (no host Node.js required). The `.env` file is copied from a fixed path on the Jenkins host (`/home/ubuntu/codes/...`).

### Key environment variables (backend `.env`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `KEYCLOAK_SERVER_URL` | Keycloak base URL |
| `KEYCLOAK_REALM` | Realm name (`inventory`) |
| `KEYCLOAK_CLIENT_ID` / `KEYCLOAK_CLIENT_SECRET` | Backend client credentials |
| `HUGGINGFACE_API_KEY` / `HUGGINGFACE_MODEL` | AI agent LLM |
| `MAIL_USER` / `MAIL_PASS` | Gmail SMTP for password reset |
| `FRONTEND_URL` | Used in reset-password email links |

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Inventory-Management** (9765 symbols, 22280 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Inventory-Management/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Inventory-Management/clusters` | All functional areas |
| `gitnexus://repo/Inventory-Management/processes` | All execution flows |
| `gitnexus://repo/Inventory-Management/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
