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
