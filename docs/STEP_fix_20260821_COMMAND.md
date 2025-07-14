# STEP_fix_20260821_COMMAND.md
## Project Context Summary
The previous fix documented the void reading workflow but the OpenAPI files were not updated. Frontend generators rely on the specification to create API hooks and types.

## Steps Already Implemented
- All fixes through `2026-08-20` are listed in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Extend `docs/openapi.yaml` and `frontend/docs/openapi-v1.yaml` with the `POST /nozzle-readings/{id}/void` path including a `reason` body.
- Regenerate `src/types/api.ts` using `openapi-typescript`.
- Update changelog, phase summary and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/openapi.yaml`
- `frontend/docs/openapi-v1.yaml`
- `src/types/api.ts`
- `docs/STEP_fix_20260821.md`
- `docs/STEP_fix_20260821_COMMAND.md`
