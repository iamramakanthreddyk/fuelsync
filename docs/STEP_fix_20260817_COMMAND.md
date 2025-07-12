# STEP_fix_20260817_COMMAND.md
## Project Context Summary
A previous fix added `opening_reading`, `closing_reading` and `variance` fields to `day_reconciliations` in the schema templates. Existing databases that only ran incremental migrations lack these columns. API calls fail with `column \"opening_reading\" does not exist`.

## Steps Already Implemented
- Fixes through `2026-08-16` are recorded in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Create new migration `migrations/schema/012_add_day_reconciliation_readings.sql` adding the three missing columns with defaults.
- Update `prisma/schema.prisma` DayReconciliation model with `opening_reading`, `closing_reading` and `variance` fields.
- Run `npx prisma generate` and `npm run build` to ensure compilation.
- Document the fix in CHANGELOG, PHASE_2_SUMMARY and IMPLEMENTATION_INDEX.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260817.md`
- `docs/STEP_fix_20260817_COMMAND.md`
