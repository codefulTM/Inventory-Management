# Inventory Management System

## 1. Brief Overview

Inventory Management is a **role-based web application** for material and inventory lot lifecycle management in warehouse/ manufacturing settings. The system tracks materials from receipt through QC testing, production batches, and final delivery—ensuring full traceability and compliance with regulatory requirements.

**Primary Purpose:**
- Replace manual paper-based inventory tracking
- Ensure regulatory compliance
- Track raw materials from receipt to delivery
- Block rejected/expired lots from use
- Generate reports and analytics

**Target Users:**
- Small to medium warehouses/businesses
- Academic project for Software Engineering courses

---

## 2. Core Workflow

```
Material Setup → Lot Receipt → QC Testing → Accepted/Rejected → 
Inventory Movement → Production Batch → Label Generation → Reporting
```

### Main Business Chain:

1. **Manager** creates/approves materials (master data)
2. **Operator** receives inventory lots into the system (Receipt transaction)
3. **QC Technician** performs quality tests and decides pass/fail
4. **Manager** creates production batches
5. **Operator** adds lot components to batches
6. **System** generates finished products and labels
7. **All** transactions are logged for traceability and audit

### Transaction Types:
| Type | Description | Quantity Change |
|------|------------|--------------|
| Receipt | Stock received into warehouse | + |
| Usage | Material used in production | - |
| Split | Divide lot into smaller lots | ± |
| Adjustment | Manual quantity correction | ± |
| Transfer | Move between locations | ± |
| Disposal | Discard/destroy material | - |

### Lot Status Flow:
```
Quarantine → QC Testing → Accepted / Rejected → Depleted (when quantity = 0)
```

---

## 3. User Roles

| Role | Responsibilities |
|------|-----------------|
| **Manager** | Material governance, batch planning, reports, approve import/export orders, oversight |
| **Operator** | Stock in/out execution, barcode scanning, lot receiving, production batch operations |
| **QC Technician** | Execute QC tests, approve/reject lots, quality traceability |
| **IT Administrator** | User management, RBAC, system monitoring, backup/restore, configuration |

---

## 4. Key Features

### Material Management
- Master data for raw materials, APIs, excipients, containers
- Part number, type, storage conditions, specifications
- Version control and change history

### Inventory Lot Tracking
- Unique lot IDs with full traceability
- Manufacturer/supplier information
- Expiration date tracking
- Sample lot creation for QC
- Status management (Quarantine → Accepted/Rejected/Depleted)

### Inventory Transactions
- Automatic transaction logging on every quantity change
- Full audit trail with performed_by, timestamp, notes
- Support for 6 transaction types

### Production Batch Management
- Batch creation with product, size, dates
- Component tracking (planned vs actual quantity)
- Status workflow (In Progress → Complete/Hold/Cancelled)

### Quality Control
- Test types: Identity, Potency, Microbial, Growth Promotion, Physical, Chemical
- Pass/Fail/Pending results
- Verification workflow

### Label Generation
- Multiple label types: Raw Material, Sample, Finished Product, API, Status
- Barcode/QR code generation
- Template-based printing

### Import/Export Orders
- Create and manage import/export requests
- Approval workflow
- Attachment handling

### Inventory Adjustment & Audit
- Manual quantity adjustments with reason
- Audit report generation
- PDF export with signatures

### AI Agents (Optional Feature)
- Warehouse Operator Agent
- QC Compliance Checker Agent
- Supervisor Agent
- Inventory Analyst Agent

---

## 5. Architecture

### Tech Stack:
| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TailwindCSS v4 |
| Backend | NestJS (REST API) |
| Database | MongoDB |
| Auth | Keycloak (OIDC/JWT) or local JWT |
| Event Bus | Kafka (optional) |
| Testing | Jest |

### Runtime Ports:
- Frontend: `5173`
- Backend: `3000`
- MongoDB: `27017`

### Backend Modules:
- Auth, User, Material, Inventory Lot, Production Batch
- Inventory Transaction, QC Test, Label Template
- Import/Export Order, Inventory Adjustment, Inventory Audit Report
- Warehouse Hierarchy, System Monitoring, Log Management
- Barcode, Metrics, Reports, Audit Log, AI Agents

### Frontend Structure:
- Role-based pages: admin, manager, operator, qc
- Shared service layer with Axios
- Domain services for materials, lots, transactions, QC, labels, production

### Database Collections:
- users, materials, inventory_lots, inventory_transactions
- production_batches, batch_components, qc_tests
- label_templates, warehouse_locations

---

## 6. Data Model Summary

### Core Entities:

**Material** → multiple **InventoryLot**
**InventoryLot** → multiple **InventoryTransaction**
**InventoryLot** → multiple **QCTest**
**ProductionBatch** → multiple **BatchComponent** (links to InventoryLot)
**ProductionBatch** → belongs to **Material** (product)

### Key Relationships:
```
Material ──1:N──> InventoryLots ──1:N──> InventoryTransactions
     │                    │
     │                    ├──1:N──> QCTests
     │                    │
     │                    └──1:N──> BatchComponents <──N:1── ProductionBatches
     │                                                              │
     └──────────────────1:N (product_id)───────────────────────────┘
```

---

## 7. Business Rules

- Every quantity change must create an InventoryTransaction
- New lots start in `Quarantine` status
- Lots can only become `Accepted` after all required QC tests pass
- Rejected lots cannot be used in production
- Negative stock is not allowed after transactions
- All operations must have performed_by for audit trail
- No hard deletes—use soft delete or archive
- Production batches can only use Accepted lots

---

## 8. API Endpoints Overview

| Module | Key Endpoints |
|--------|---------------|
| Auth | /auth/login, /auth/register, /auth/refresh |
| Material | /materials (CRUD) |
| Inventory Lot | /inventory-lots (CRUD), /inventory-lots/:id/transactions |
| Inventory Transaction | /inventory-transactions (CRUD), /my-history |
| Production Batch | /production-batches (CRUD), /:id/components |
| QC Test | /qc-tests (CRUD), /:lotId/tests |
| Import/Export Order | /import-export-orders (CRUD), /:id/confirm, /:id/reject |
| Inventory Adjustment | /inventory-adjustments (CRUD) |
| Inventory Audit Report | /inventory-audit-reports (CRUD), /export-pdf |

---

## 9. Running the System

### Prerequisites:
- Node.js 18+
- Docker & Docker Compose
- MongoDB (or use Docker)

### Commands:

```bash
# Backend
cd 02_Source/01_Source Code/backend
npm install
npm run start:dev

# Frontend
cd 02_Source/01_Source Code/frontend
npm install
npm run dev

# Database (MongoDB)
docker-compose up -d mongodb
```

### Environment:
- MongoDB URI configured in backend `.env`
- Keycloak for production; local JWT for development

---

## 10. Project Structure

```
Inventory-Management/
├── 01_Documents/           # Business analysis docs
│   ├── 01_Business Cases.md
│   ├── 02_Domain Model.md
│   ├── Workflow.md
│   └── ...
├── 02_Source/
│   ├── 01_Source Code/
│   │   ├── backend/       # NestJS API
│   │   │   └── src/
│   │   ├── frontend/     # React + Vite
│   │   │   └── src/
│   │   └── .github/workflows/
│   ├── docker-compose.yml
│   └── README.md
├── AGENTS.md              # Developer instructions
└── SYSTEM.md             # This file
```

---

*Generated for quick onboarding and system understanding.*