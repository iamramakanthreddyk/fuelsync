# STEP_fix_20260828_COMMAND.md
## Project Context Summary
Recent audits showed that nozzle reading routes lacked explicit role checks and the OpenAPI spec does not document role access. Previous fixes through 2026-08-27 are logged in `IMPLEMENTATION_INDEX.md`.

## Steps Already Implemented
- Backend routes exist for creating, listing, updating and voiding nozzle readings.
- `requireRole` middleware is available for enforcing RBAC.
- OpenAPI docs cover all operations but omit role annotations.

## What to Build Now
- Update `src/routes/nozzleReading.route.ts` to enforce roles on all routes. Creation, list, get and can-create should allow owner, manager and attendant. Update and void remain manager/owner only.
- Add `x-roles` arrays to nozzle reading operations in `docs/openapi.yaml` and `frontend/docs/openapi-v1.yaml`.
- Regenerate `src/types/api.ts` using `openapi-typescript`.
- Document the changes in changelog, implementation index and phase summary.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/openapi.yaml`
- `frontend/docs/openapi-v1.yaml`
- `src/types/api.ts`
- `docs/STEP_fix_20260828.md`
- `docs/STEP_fix_20260828_COMMAND.md`
