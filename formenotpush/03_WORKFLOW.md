# Workflow Documentation

Generated date: 2026-04-01
Scope: operational workflow as implemented (target + current-state notes)

## 1. Core Workflow Overview

Primary business chain:
1. Material setup
2. Inventory lot receipt
3. QC testing and decision
4. Inventory movement transactions
5. Production batch execution
6. Label generation/printing
7. Reporting and traceability

## 2. Detailed Workflow: Receipt to QC

Step 1: Manager defines material and standards.
- Output: material metadata, compliance fields, storage rules.

Step 2: Operator receives lot into system.
- Output: inventory lot in quarantine/initial status.

Step 3: System records receipt transaction.
- Output: immutable movement history starts.

Step 4: QC technician creates and executes QC tests.
- Output: pass/fail/pending decision artifacts.

Step 5: QC decision updates lot status.
- Typical transitions: Quarantine -> Accepted or Rejected.

## 3. Detailed Workflow: Production Batch

Step 1: Manager creates production batch.
Step 2: Operator adds lot components to batch.
Step 3: Usage transactions are logged for consumed quantities.
Step 4: Batch completion generates finished inventory record.
Step 5: Labels are generated for finished goods.

## 4. Detailed Workflow: Inventory Movement

Supported movement semantics:
- Receipt
- Usage
- Split
- Adjustment
- Transfer
- Disposal

Expected behavior:
- Each movement writes traceable transaction records.
- Quantity and status changes must remain consistent with lot lifecycle state.
- Reason/actor/time metadata should be preserved for audit purposes.

## 5. Role-Oriented Workflow Responsibilities

Manager:
- Material governance
- Batch planning
- Cross-workflow oversight
- Reporting decisions

Operator:
- Stock in/out execution
- Component addition and warehouse actions

QC Technician:
- Test execution
- Lot release/reject decisioning
- Quality traceability

IT Administrator:
- System monitoring
- User/role administration
- Backup/recovery and incident support

## 6. Current Workflow Completion Snapshot

Mostly implemented:
- Core backend entities and transaction flows.
- QC and batch foundations.
- Label and reporting building blocks.

Partially implemented:
- Some UI workflows are only partial or placeholder.
- Certain integrations still include TODO/mocked paths.

## 7. Workflow Control Recommendations

1. Define workflow state machine rules centrally (status transitions + guard conditions).
2. Add workflow-level integration tests for critical chains:
- Receipt -> QC -> Usage
- Batch creation -> component add -> completion
3. Add explicit workflow error matrix for operator and QC failures.
4. Publish role-based SOP runbooks for daily operations.
