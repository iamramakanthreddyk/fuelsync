# STEP_fix_20260810_COMMAND.md
## Project Context Summary
Existing backend and OpenAPI spec describe `ReconciliationRecord` with totals based fields `totalExpected` and `cashReceived`.
However the latest frontend contract expects fields `openingReading`, `closingReading` and `variance`. The API must be updated to match this contract.

## Steps Already Implemented
- All fixes through `2026-08-09` including User `updatedAt` field exposure.

## What to Build Now
- Update database schema templates to store `opening_reading`, `closing_reading` and `variance` in `day_reconciliations`.
- Update `reconciliation.service.ts` to calculate these readings from nozzle readings and sales volume, persist them, and return them.
- Update controller methods to return the new fields.
- Replace `totalExpected` and `cashReceived` in `ReconciliationRecord` schemas with the reading based fields in `docs/openapi.yaml` and `frontend/docs/openapi-v1.yaml`.
- Add docs entries in CHANGELOG, PHASE_2_SUMMARY and IMPLEMENTATION_INDEX.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260810.md`
- `docs/openapi.yaml`
- `frontend/docs/openapi-v1.yaml`
