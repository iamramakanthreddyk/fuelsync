# STEP_fix_20250727_COMMAND.md

## Project Context Summary
FuelSync Hub's `/todays-sales/summary` endpoint should aggregate daily sales from the `sales` table. A recent commit reverted the query to use `nozzle_readings` with placeholder zeros, causing totals to be incorrect.

## Steps Already Implemented
- Up to `docs/STEP_fix_20250726_COMMAND.md` including the previous fix that queried the `sales` table correctly.

## What to Build Now
- Restore `src/services/todaysSales.service.ts` to aggregate volume and amount from `sales`.
- Keep credit sales optional handling (`.catch()` on query).
- Update docs accordingly.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20250727_COMMAND.md`
