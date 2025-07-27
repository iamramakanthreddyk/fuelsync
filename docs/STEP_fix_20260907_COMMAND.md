# STEP_fix_20260907_COMMAND.md

## Project Context Summary
FuelSync returns sales and inventory data from Postgres DECIMAL columns. The previous fix converted numbers in `/reports/sales`, but other endpoints rely on the `parseDb` helpers. These helpers currently only parse numeric strings, not Prisma `Decimal` objects, so some Prisma-based services may still return decimal objects.

## Steps Already Implemented
- `docs/STEP_fix_20260906_COMMAND.md` converted DECIMAL strings in `reports.controller.ts`.

## What to Build Now
- Extend `src/utils/parseDb.ts` to also convert Prisma Decimal instances to numbers.
- Refactor `reports.controller.ts` to use `parseRows` so the new parser applies automatically.
- Update changelog, phase summary and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- This command file
