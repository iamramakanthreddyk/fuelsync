# STEP_fix_20260805_COMMAND.md
## Project Context Summary
Sales controller and service were recently updated. Previous fixes added some missing endpoints, but we need to verify every controller route has a matching entry in `docs/openapi.yaml`.

## Steps Already Implemented
- `STEP_fix_20260803` documented many missing paths.
- `STEP_fix_20260804` covered admin dashboard and tenant settings endpoints.
OpenAPI should now track most routes.

## What to Build Now
- Re‑audit all routers under `src/routes` to ensure every path appears in `docs/openapi.yaml`.
- Add or adjust OpenAPI paths for any endpoints discovered during the audit.
- Run `npm test --silent -- -t openapiRoutes` to validate documentation coverage.
- Update CHANGELOG, PHASE_2_SUMMARY and IMPLEMENTATION_INDEX with this fix step.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260805.md`
- `docs/openapi.yaml`
