# STEP_fix_20260825_COMMAND.md
## Project Context Summary
The login endpoint currently reads `x-tenant-id` from headers to determine the tenant schema.
Users reported that login should succeed without providing this header. Each email is unique in the system, so the tenant can be determined by querying the users table.

## Steps Already Implemented
- `STEP_fix_20260824_COMMAND.md` added DB connection debug logs.

## What to Build Now
- Remove the `x-tenant-id` header usage from `src/controllers/auth.controller.ts`.
- Update `login` service in `src/services/auth.service.ts` to auto-detect the tenant by email when no tenant id is supplied.
- Update OpenAPI spec so `/auth/login` requires no `tenantHeader`.
- Document the new behaviour.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260825.md`
- `docs/STEP_fix_20260825_COMMAND.md`
