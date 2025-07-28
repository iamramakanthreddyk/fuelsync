# STEP_fix_20250728_COMMAND.md

## Project Context Summary
Recent API requests to `/reconciliation/daily-summary` fail with `operator does not exist: text = uuid`. The `reconciliation_diff` table stores several ID columns as `TEXT` which breaks joins and lookups when UUID values are used. Some service queries also compare UUID columns to uncast parameters.

## Steps Already Implemented
- `docs/STEP_fix_20250727_COMMAND.md` restored the sales summary query.

## What to Build Now
- Add migration `014_update_reconciliation_diff_uuid.sql` to convert ID fields in `reconciliation_diff` to `UUID`.
- Update `reconciliation.service.ts` and `hasStationAccess.ts` to explicitly cast UUID and DATE parameters in all queries.
- Ensure daily summary and reconciliation endpoints no longer error on UUID comparisons.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20250728_COMMAND.md`
