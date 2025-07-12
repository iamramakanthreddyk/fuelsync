# STEP_fix_20260811_COMMAND.md
## Project Context Summary
Previous fix aligned `ReconciliationRecord` modeling to reading based fields. However `CreateReconciliationRequest` in the OpenAPI spec still used `totalExpected` and `cashReceived` which the backend no longer expects. The create handler also used `reconciliationDate` field name not reflected in the spec.

## Steps Already Implemented
- Fixes through `2026-08-10` including ReconciliationRecord contract alignment.

## What to Build Now
- Update `CreateReconciliationRequest` schema in `docs/openapi.yaml` and `frontend/docs/openapi-v1.yaml` to remove `totalExpected` and `cashReceived` and require only `stationId`, `date`, and `managerConfirmation`.
- Update `reconciliation.controller.ts` create handler to expect `date` instead of `reconciliationDate`.
- Document the fix in CHANGELOG, IMPLEMENTATION_INDEX, and PHASE_2_SUMMARY.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/openapi.yaml`
- `frontend/docs/openapi-v1.yaml`
