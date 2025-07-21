# STEP_fix_20260825_COMMAND.md
## Project Context Summary
The backend and database are now hosted on Render. The new database needs the unified schema and future migrations applied automatically during deployments.

## Steps Already Implemented
Fixes through `2026-08-24` are recorded in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Update `package.json` so `postinstall` runs `prisma generate` and executes pending migrations via `node scripts/migrate.js up`.
- Add a Render deployment guide explaining initial setup and automated migrations.
- Document the change in a new step file.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260825.md`
- `docs/STEP_fix_20260825_COMMAND.md`
- `docs/RENDER_DEPLOYMENT_GUIDE.md`
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
