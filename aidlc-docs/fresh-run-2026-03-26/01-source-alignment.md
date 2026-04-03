# Fresh AI-DOC - Source Alignment (01_Documents)

## Scope Basis
This fresh documentation run is generated from current implementation work and direct alignment with:
- 01_Documents/Workflow.md
- 01_Documents/04_Product Backlog.md

## Targeted P0 Flow in This Iteration
From business workflow and backlog:
1. Operator creates stock-in receipt and lot entry (US02 Operator/Manager stream).
2. Operator performs stock-out usage transaction with quantity deduction (US01/US02 Operator stream).
3. Every inventory movement should create traceable transactions.

## Implemented Mapping
- Stock In page now creates:
  - inventory lot record (Quarantine status by default)
  - receipt transaction (transaction_type=Receipt)
- Stock Out page now performs:
  - quantity deduction on selected lot
  - usage transaction creation (transaction_type=Usage)

## Security / Compliance Notes (Applicable Rules)
- SECURITY-05 Input validation: implemented through DTO/class-validator on transaction create endpoint.
- SECURITY-08 Access control: transaction create endpoint protected by JwtAuthGuard + RolesGuard and role constraints.
- SECURITY-15 Fail-safe defaults: API errors are surfaced and operations abort on failure.

## Out-of-Scope This Iteration
- Full offline mode for operator workflows.
- Inventory audit mobile-first flow.
- IT admin monitoring/backup pages.
- Label template full backend integration.
