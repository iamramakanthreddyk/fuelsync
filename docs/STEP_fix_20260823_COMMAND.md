# STEP_fix_20260823_COMMAND.md
## Project Context Summary
Owners report a 500 error when calling `/analytics/station-ranking`. The backend throws a Prisma error `column "total_sales" does not exist` due to the raw SQL ranking query referencing an alias inside the `RANK()` window function.

## Steps Already Implemented
Fixes are documented through `2026-08-22`.

## What to Build Now
- Update `getStationRanking` in `src/services/station.service.ts` so the ranking expression uses base sales, profit or volume fields instead of the computed alias.
- Run `npm install` and `npm run build` to ensure the project compiles.
- Document the fix in `CHANGELOG.md`, `PHASE_2_SUMMARY.md` and `IMPLEMENTATION_INDEX.md`.
- Summarize the work in `docs/STEP_fix_20260823.md`.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260823.md`
