# STEP_fix_20260826_COMMAND.md
## Project Context Summary
Docker-based deployments to Azure App Service terminate because the Prisma CLI is not executable inside the container. The Dockerfile currently installs dependencies and runs `npx prisma generate` but does not set the executable bit for the Prisma binary.

## Steps Already Implemented
Fixes through `2026-08-25` are logged in `IMPLEMENTATION_INDEX.md`.

## What to Build Now
- Update `Dockerfile` to run `chmod +x ./node_modules/.bin/prisma` after installing dependencies.
- Document the fix in the changelog, phase summary, and implementation index.

## Required Documentation Updates
- `docs/CHANGELOG.md`
- `docs/IMPLEMENTATION_INDEX.md`
- `docs/PHASE_2_SUMMARY.md`
- `docs/STEP_fix_20260826.md`
- `docs/STEP_fix_20260826_COMMAND.md`
