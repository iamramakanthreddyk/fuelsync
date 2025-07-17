# STEP_fix_20260827_COMMAND.md
## Project Context Summary
Previous fixes generated the Prisma client during `postinstall`. Azure App Service lacked the permissions for runtime generation, causing failures. We need to move Prisma generation to the build step executed in CI and simplify deployment.

## Steps Already Implemented
Fixes through `2026-08-26` are logged in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Update `package.json`:
  - Remove the `postinstall` script.
  - Set the `build` script to `npx prisma generate && tsc`.
- Add `.github/workflows/deploy.yml` that installs dependencies, runs the build, zips the app, and deploys with `azure/webapps-deploy` using a publish profile.
- Document the update in changelog, phase summary, and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260827.md`
- `docs/STEP_fix_20260827_COMMAND.md`
