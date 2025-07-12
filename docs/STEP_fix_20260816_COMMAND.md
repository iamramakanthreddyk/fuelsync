# STEP_fix_20260816_COMMAND.md
## Project Context Summary
Owners receive `Station access denied` errors when requesting dashboard or sales endpoints with `stationId`. Access checks rely solely on `user_stations` mappings, but owners are not linked to every station.

## Steps Already Implemented
- Fixes through `2026-08-15` are recorded in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Add a helper `hasStationAccess` that allows owners to access any station within their tenant.
- Update `checkStationAccess` middleware and dashboard/sales controllers to use this helper.
- Run `npm run build` to verify compilation.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260816_COMMAND.md`
