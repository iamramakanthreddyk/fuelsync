# STEP_fix_20260822_COMMAND.md
## Project Context Summary
FuelSync's migration runner applies schema updates stored under `migrations/schema`. The latest documented fix (2026-08-21) added the void reading endpoint. The associated migration `20250714_add_reading_audit.sql` introduces audit logging and a status column, but the docs don't explicitly mention running it.

## Steps Already Implemented
- All fixes through `2026-08-21` are recorded in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Update `docs/DATABASE_MANAGEMENT.md` with a short note reminding developers to run `node scripts/migrate.js up` to apply `20250714_add_reading_audit.sql`.
- Mention that the migration adds a `status` column to `nozzle_readings` and creates the `reading_audit_log` table.
- Link this migration in `PHASE_1_SUMMARY.md` if that document exists.
- Document the change in `CHANGELOG.md` and add a row in `IMPLEMENTATION_INDEX.md`.

## Required Documentation Updates
- `docs/DATABASE_MANAGEMENT.md`
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260822.md`
- `docs/STEP_fix_20260822_COMMAND.md`
