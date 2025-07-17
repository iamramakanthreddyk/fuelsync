# STEP_fix_20260824_COMMAND.md
## Project Context Summary
Deployments using Azure App Service with the default Oryx build pipeline fail when Prisma is not generated before startup. Existing workflows also use the deprecated `azure/login` action. We need to streamline the build scripts and remove unused workflows.

## Steps Already Implemented
Fixes through `2026-08-23` are logged in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Simplify `package.json` so `prisma generate` runs via `postinstall` and remove any `prestart` or `chmod` commands.
- Ensure the production start script runs the compiled app (e.g. `node dist/src/app.js`).
- Delete `.github/workflows/main_fuelsync.yml` and any `deploy.yml` workflow if present.
- Document the update in the changelog, phase summary and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260824.md`
- `docs/STEP_fix_20260824_COMMAND.md`
