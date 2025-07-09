# STEP_fix_20260806_COMMAND.md
## Project Context Summary
Controllers were updated again and questions remain about whether every route is represented in `docs/openapi.yaml`. The previous audit step (2026-08-05) found no gaps, but we will recheck using a simple script.

## Steps Already Implemented
- `STEP_fix_20260803` added numerous missing paths.
- `STEP_fix_20260804` documented admin dashboard and analytics endpoints.
- `STEP_fix_20260805` verified coverage after sales service changes.

## What to Build Now
- Add a script `scripts/audit-openapi-spec.ts` that lists missing and extra endpoints by scanning `src/routes` and the OpenAPI spec.
- Run the script and update `docs/openapi.yaml` if any paths are missing.
- Execute `npm test --silent -- -t openapiRoutes` (will fail due to docker-compose) and capture the result.
- Document the fix in the changelog, phase summary, and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260806.md`
- `docs/openapi.yaml`
