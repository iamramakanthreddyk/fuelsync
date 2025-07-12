# STEP_fix_20260815_COMMAND.md
## Project Context Summary
Dashboard endpoints fail with a 500 error when requesting a specific station. The code checks `public.user_stations` for a `tenant_id` column which doesn't exist. Access checks should join `stations` and filter by its `tenant_id`.

## Steps Already Implemented
- Fixes through `2026-08-14` are recorded in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Update all station access queries in `dashboard.controller.ts` and `checkStationAccess.ts` to join `public.stations` and verify `s.tenant_id`.
- Add the same access validation for `stationId` in `sales.controller.ts` instead of skipping the check.
- Run `npm run build` to ensure the project compiles.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260815_COMMAND.md`
