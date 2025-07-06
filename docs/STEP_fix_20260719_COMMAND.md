# STEP_fix_20260719_COMMAND.md

## Project Context Summary
The previous fix added optional `validFrom` and `effectiveTo` for fuel prices. However
existing prices were not automatically closed when inserting a new price, causing
overlapping ranges.

## Steps Already Implemented
Fix through `2026-07-18` includes fuel price effective dates support.

## What to Build Now
- Update fuel price creation logic so a new price closes any open range for the
  same station and fuel type by setting `effective_to` of the previous row to the
  new `valid_from`.
- Apply this in both the Prisma controller and the raw service implementation.
- Document the change in the changelog, phase summary and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260719_COMMAND.md`
