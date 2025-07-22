# STEP_2_59_COMMAND.md
## Project Context Summary
FuelSync Hub is a multi-tenant ERP for fuel stations. The backend is implemented in Node.js with PostgreSQL and Prisma. Existing reconciliation endpoints return 404 when data rows are missing even if the day has been finalized. Nozzle readings and cash reports each check day finalization in different ways leading to inconsistent behaviour.

## Steps Already Implemented
- Backend APIs and services up to **Step 2.58** with unit tests and OpenAPI spec.
- Fixes up to **2026-09-05** documented in CHANGELOG and phase summaries.

## What to Build Now
- Add helper utilities in `src/services/reconciliation.service.ts`:
  - `getOrCreateDailyReconciliation(tenantId, stationId, date)`
  - `isFinalized(tenantId, stationId, date)` (alias for previous `isDayFinalized`)
  - `markDayAsFinalized(tenantId, stationId, date)`
- Refactor nozzle reading and cash report creation to use `isFinalized`.
- Ensure GET reconciliation endpoints use `getOrCreateDailyReconciliation` so finalized days never return 404.
- Create migration `migrations/schema/013_prevent_finalized_writes.sql` adding triggers that block inserts into `nozzle_readings` and `cash_reports` when a day is finalized.
- Add unit tests for the new helper.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_2_59_COMMAND.md`
