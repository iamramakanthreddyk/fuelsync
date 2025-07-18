# STEP_fix_20260822_COMMAND.md
## Project Context Summary
Recent deployments to Azure failed because the workflow zipped the entire repository. Azure App Service expects the zip to contain only the built application files (package.json, node_modules, dist). The last documented step was `2026-08-21`.

## Steps Already Implemented
- All fixes through `2026-08-21` are listed in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Update `.github/workflows/main_fuelsync.yml` so the Zip step includes only the Node.js build output and dependencies.
- Record the change in `CHANGELOG.md`, `PHASE_2_SUMMARY.md` and `IMPLEMENTATION_INDEX.md`.
- Document this fix in `docs/STEP_fix_20260822.md`.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/STEP_fix_20260822.md`
