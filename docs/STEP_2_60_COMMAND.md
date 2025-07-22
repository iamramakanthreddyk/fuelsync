# STEP_2_60_COMMAND.md
## Project Context Summary
FuelSync Hub handles daily reconciliations for each station. The last step introduced helper utilities to ensure reconciliation rows exist and finalization checks are shared. However these helpers did not verify that a station belongs to the requesting tenant which allowed accidental cross-tenant records and GET endpoints still returned 404 in controllers.

## Steps Already Implemented
- Backend reconciliation helpers up to **Step 2.59** with database triggers to block writes after finalization.

## What to Build Now
- Add `stationBelongsToTenant` utility in `src/utils/hasStationAccess.ts`.
- Update `getOrCreateDailyReconciliation` to verify station ownership before creating a row; throw `Station not found` otherwise.
- Remove 404 check from reconciliation GET controller so finalized days always return data.
- Add unit tests for the new ownership check.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_2_60_COMMAND.md`
