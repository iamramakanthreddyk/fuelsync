# STEP_fix_20260726_COMMAND.md

## Project Context Summary
The seeding script currently inserts a full demo tenant and related data. It also fails when `DATABASE_URL` is not provided. For simple deployments we only need two superadmin accounts seeded.

## Steps Already Implemented
Fixes through `2026-07-25` including UI tweaks and attendant restrictions.

## What to Build Now
- Update `scripts/seed-data.js` to derive `DATABASE_URL` from `DB_*` variables when absent.
- Remove tenant, plan and demo data seeding; only create two superadmin users.
- Exit with a non-zero status if seeding fails.
- Document the change in the changelog, implementation index and phase summary.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260726.md`
