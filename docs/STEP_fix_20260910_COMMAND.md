# STEP_fix_20260910_COMMAND.md
## Project Context Summary
FuelSync Hub is a multi-tenant SaaS ERP for fuel stations. Backend routes have changed and documentation is outdated.

## Steps Already Implemented
Fixes up to `2026-09-09` are documented in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Create `scripts/generate-api-docs.js` to scan `src/app.ts` and route files and generate a consolidated endpoint list and OpenAPI spec.
- Run the script to produce `docs/backend_brain.md` and refresh `docs/openapi.yaml` based on current routes.
- Verify parity using `node merge-api-docs.js` and run `npm test`.
- Update `CHANGELOG.md`, `PHASE_2_SUMMARY.md`, and `IMPLEMENTATION_INDEX.md`.
- Record this action in `docs/STEP_fix_20260910.md`.

## Required Documentation Updates
- `docs/backend_brain.md`
- `docs/openapi.yaml`
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260910.md`
- `docs/STEP_fix_20260910_COMMAND.md`
