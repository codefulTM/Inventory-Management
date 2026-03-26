# Fresh AI-DOC - Next Completion Units

## Priority Queue (Based on 01_Documents Backlog P0/P1)
1. Operator Inventory Audit (US04, P0)
   - Replace placeholder page
   - Implement count entry and discrepancy detection
   - Persist adjustment proposal records

2. IT Admin Monitoring and Backup (US01, US03, P0)
   - Replace DashboardIT/SystemMonitoring/BackupRestore placeholders
   - Implement health summary + backup schedule UI against available APIs

3. Label Template Real Data Integration
   - Replace mock data usage in backend label-template service
   - Integrate InventoryLot and ProductionBatch lookups

4. QC Re-test and Quarantine bulk operations
   - Extend QC workflows with pending re-test queue and lot status actions

## Exit Criteria for "Finished" Claim
A practical completion threshold for this repository state:
- No remaining placeholder pages on primary routes (manager/operator/admin/qc dashboards and core workflows)
- Core inbound/outbound/audit/production/qc flows executable end-to-end
- Build passes for backend and frontend
- Targeted tests exist for newly added workflows
- Updated fresh AI-DOC generated for each completion iteration
