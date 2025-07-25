# STEP_fix_20250725_COMMAND.md

## Project Context Summary
FuelSync Hub is a multi-tenant ERP platform. Backend implementation up to Step 2.61 introduced `/todays-sales/summary` to provide a daily sales snapshot. During local testing this endpoint failed because the service queried the legacy `nozzle_readings` table which no longer contains `volume` and `amount` columns in the unified schema.

## Steps Already Implemented
- Up to `docs/STEP_2_61_COMMAND.md` and subsequent fix steps in December 2025.

## What to Build Now
- Update `src/services/todaysSales.service.ts` to aggregate data from `sales` instead of `nozzle_readings`.
- Ensure all integration and unit tests pass (`npm run test:unit`).
- Document the fix in CHANGELOG, PHASE_2_SUMMARY and IMPLEMENTATION_INDEX.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
