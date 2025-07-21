# STEP_fix_20260823_COMMAND.md
## Project Context Summary
Render deployment still fails due to compiled output nested in `dist/src`.
Previous fix added a `prestart` script but the TypeScript config still places files under `dist/src` so the runtime path mismatches.

## Steps Already Implemented
See `IMPLEMENTATION_INDEX.md` for fixes through `2026-08-22` including the `prestart` script.

## What to Build Now
- Update `tsconfig.json` to use `rootDir: "src"` and `outDir: "dist"`.
- Ensure `include` remains `"src/**/*"`.
- Update `package.json` start script to `node dist/app.js`.
- Verify build output and commit.
- Document the fix in `CHANGELOG.md`, `PHASE_2_SUMMARY.md`, and `IMPLEMENTATION_INDEX.md`.
- Record actions in `docs/STEP_fix_20260823.md`.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260823.md`
- `docs/STEP_fix_20260823_COMMAND.md`
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
